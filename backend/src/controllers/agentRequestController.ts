import { Request, Response } from 'express';
import AgentRequest from '../models/AgentRequest';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import emailService from '../services/emailService';
import { geocodeFreeformLocation, calculateDistanceKm } from '../services/geocodingService';
import { apiLogger } from '../utils/logger';

const SEARCH_RADIUS_KM = 25; // 20-25 km radius for finding nearby agents

// Create a new agent request
export const createAgentRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, location, propertyDescription } = req.body;

    // Validate required fields
    if (!email || !phone || !location || !propertyDescription) {
       res.status(400).json({ message: 'All fields are required' });
       return
    }

    // Create the request
    const agentRequest = new AgentRequest({
      email,
      phone,
      location,
      propertyDescription,
      status: 'pending',
    });

    await agentRequest.save();

    // Geocode the user's location to get coordinates
    const geocodeResult = await geocodeFreeformLocation(location);
    let userLat: number | null = null;
    let userLng: number | null = null;

    if (geocodeResult) {
      userLat = geocodeResult.lat;
      userLng = geocodeResult.lng;
      apiLogger.info(`📍 User location geocoded: ${userLat}, ${userLng} (${geocodeResult.display_name})`);
    }

    // Find nearby agents within SEARCH_RADIUS_KM
    let matchedAgents: any[] = [];
    let matchedAgencies: any[] = [];
    const locationLower = location.toLowerCase();

    if (userLat !== null && userLng !== null) {
      // === GEO-BASED SEARCH ===
      // Find all agents with coordinates and filter by distance
      const allAgentsWithCoords = await Agent.find({
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
        isActive: true,
      })
        .populate({
          path: 'userId',
          select: 'name email phone city country',
        })
        .sort({ totalSales: -1, rating: -1 })
        .select('_id agentId userId lat lng serviceAreas officeAddress officePhone');

      // Filter agents within radius
      for (const agent of allAgentsWithCoords) {
        if (agent.lat && agent.lng) {
          const distance = calculateDistanceKm(userLat, userLng, agent.lat, agent.lng);
          if (distance <= SEARCH_RADIUS_KM) {
            matchedAgents.push({ ...agent.toObject(), distance });
          }
        }
      }

      // Sort by distance (closest first)
      matchedAgents.sort((a, b) => a.distance - b.distance);

      // Find all agencies with coordinates and filter by distance
      const allAgenciesWithCoords = await Agency.find({
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
        isActive: true,
      })
        .select('_id name email phone lat lng address city country')
        .sort({ memberCount: -1, rating: -1 });

      // Filter agencies within radius
      for (const agency of allAgenciesWithCoords) {
        if (agency.lat && agency.lng) {
          const distance = calculateDistanceKm(userLat, userLng, agency.lat, agency.lng);
          if (distance <= SEARCH_RADIUS_KM) {
            matchedAgencies.push({ ...agency.toObject(), distance });
          }
        }
      }

      // Sort agencies by distance
      matchedAgencies.sort((a, b) => a.distance - b.distance);

      apiLogger.info(`🔍 Found ${matchedAgents.length} agents and ${matchedAgencies.length} agencies within ${SEARCH_RADIUS_KM}km`);
    }

    // Fallback: If geo-search didn't find enough, use text-based search
    if (matchedAgents.length < 3) {
      apiLogger.info('📝 Using text-based fallback search for agents...');
      const textMatchedAgents = await Agent.find({
        $or: [
          { serviceAreas: { $elemMatch: { $regex: locationLower, $options: 'i' } } },
          { officeAddress: { $regex: locationLower, $options: 'i' } },
        ],
        isActive: true,
      })
        .populate({
          path: 'userId',
          select: 'name email phone city country',
        })
        .sort({ totalSales: -1 })
        .limit(10)
        .select('_id agentId userId serviceAreas officeAddress officePhone');

      // Add text-matched agents not already in the list
      const existingIds = new Set(matchedAgents.map((a: any) => a._id.toString()));
      for (const agent of textMatchedAgents) {
        if (!existingIds.has((agent._id as any).toString())) {
          matchedAgents.push(agent.toObject());
        }
      }
    }

    // Limit results
    matchedAgents = matchedAgents.slice(0, 10);
    matchedAgencies = matchedAgencies.slice(0, 5);

    // Assign matched agents to the request
    if (matchedAgents.length > 0) {
      agentRequest.assignedAgents = matchedAgents.map(agent => agent._id);
      agentRequest.status = 'assigned';
    }

    // Track emails to be sent
    let emailsSentCount = 0;

    // Send email notifications to matched agents and agencies
    const emailsSent: string[] = [];
    const emailSubject = 'New Property Inquiry - BalkanEstate';

    // Send to agents
    for (const agent of matchedAgents) {
      const user = agent.userId as any;
      if (user?.email) {
        try {
          await emailService.sendEmail({
            to: user.email,
            subject: emailSubject,
            html: generateAgentNotificationEmail({
              agentName: user.name || 'Agent',
              clientEmail: email,
              clientPhone: phone,
              location,
              propertyDescription,
              distance: agent.distance ? `${agent.distance.toFixed(1)} km away` : 'in your service area',
            }),
          });
          emailsSent.push(user.email);
          emailsSentCount++;
        } catch (err) {
          apiLogger.error(`Failed to send email to agent ${user.email}:`, err);
        }
      }
    }

    // Send to agencies
    for (const agency of matchedAgencies) {
      if (agency.email) {
        try {
          await emailService.sendEmail({
            to: agency.email,
            subject: emailSubject,
            html: generateAgentNotificationEmail({
              agentName: agency.name || 'Agency',
              clientEmail: email,
              clientPhone: phone,
              location,
              propertyDescription,
              distance: agency.distance ? `${agency.distance.toFixed(1)} km away` : 'in your service area',
              isAgency: true,
            }),
          });
          emailsSent.push(agency.email);
          emailsSentCount++;
        } catch (err) {
          apiLogger.error(`Failed to send email to agency ${agency.email}:`, err);
        }
      }
    }

    apiLogger.info(`📧 Sent ${emailsSent.length} notification emails`);

    // Save final state with email count
    agentRequest.emailsSent = emailsSentCount;
    await agentRequest.save();

    res.status(201).json({
      message: 'Request submitted successfully',
      agentRequest: {
        id: agentRequest._id,
        email: agentRequest.email,
        location: agentRequest.location,
        status: agentRequest.status,
        matchedAgentsCount: matchedAgents.length,
        matchedAgenciesCount: matchedAgencies.length,
        notificationsSent: emailsSent.length,
      },
    });
  } catch (error) {
    apiLogger.error('Error creating agent request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Generate HTML email for agent/agency notification
 */
function generateAgentNotificationEmail(params: {
  agentName: string;
  clientEmail: string;
  clientPhone: string;
  location: string;
  propertyDescription: string;
  distance: string;
  isAgency?: boolean;
}): string {
  const { agentName, clientEmail, clientPhone, location, propertyDescription, distance, isAgency } = params;
  const recipientType = isAgency ? 'Agency' : 'Agent';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Property Inquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Property Inquiry</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A potential client is looking for help ${distance}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="margin: 0 0 20px 0;">Hello <strong>${agentName}</strong>,</p>

    <p style="margin: 0 0 20px 0;">You have received a new property inquiry from a potential client through BalkanEstate. They are looking for properties in your service area.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Client Details</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${clientEmail}" style="color: #3b82f6; text-decoration: none;">${clientEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Phone:</td>
          <td style="padding: 8px 0;"><a href="tel:${clientPhone}" style="color: #3b82f6; text-decoration: none;">${clientPhone}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Location:</td>
          <td style="padding: 8px 0; font-weight: 500;">${location}</td>
        </tr>
      </table>
    </div>

    <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Property Requirements</h3>
      <p style="margin: 0; color: #475569;">${propertyDescription}</p>
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; border: 1px solid #f59e0b; margin-bottom: 20px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>💡 Tip:</strong> Contact this client as soon as possible. Quick response times significantly improve conversion rates!
      </p>
    </div>

    <div style="text-align: center;">
      <a href="mailto:${clientEmail}?subject=RE: Your Property Inquiry on BalkanEstate" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Reply to Client
      </a>
    </div>
  </div>

  <div style="background: #1e293b; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
      This email was sent by BalkanEstate because you're registered as a ${recipientType} in this area.
    </p>
    <p style="margin: 10px 0 0 0; color: #64748b; font-size: 11px;">
      © ${new Date().getFullYear()} BalkanEstate. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// Get all agent requests (admin only - can be added later)
export const getAllAgentRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const agentRequests = await AgentRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('assignedAgents', 'agentId userId name email phone');

    const total = await AgentRequest.countDocuments(query);

    res.json({
      agentRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    apiLogger.error('Error fetching agent requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get requests assigned to a specific agent
export const getAgentRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.params.agentId;

    const agent = await Agent.findOne({ agentId });
    if (!agent) {
       res.status(404).json({ message: 'Agent not found' });
        return;
    }

    const agentRequests = await AgentRequest.find({
      assignedAgents: agent._id,
      status: { $in: ['assigned', 'contacted'] },
    }).sort({ createdAt: -1 });

    res.json({ agentRequests });
  } catch (error) {
    apiLogger.error('Error fetching agent requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update request status
export const updateAgentRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, outcome, notes, contactedBy } = req.body;

    if (status && !['pending', 'assigned', 'contacted', 'completed', 'cancelled'].includes(status)) {
       res.status(400).json({ message: 'Invalid status' });
       return;
    }

    if (outcome && !['success', 'no_response', 'not_interested', 'pending'].includes(outcome)) {
       res.status(400).json({ message: 'Invalid outcome' });
       return;
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (outcome) updateData.outcome = outcome;
    if (notes !== undefined) updateData.notes = notes;
    if (contactedBy) updateData.contactedBy = contactedBy;

    // Set completedAt when status is completed or cancelled
    if (status === 'completed' || status === 'cancelled') {
      updateData.completedAt = new Date();
    }

    const agentRequest = await AgentRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('assignedAgents', 'agentId userId')
     .populate('contactedBy', 'agentId userId');

    if (!agentRequest) {
       res.status(404).json({ message: 'Request not found' });
       return;
    }

    res.json({ agentRequest });
  } catch (error) {
    apiLogger.error('Error updating agent request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get agent request statistics for admin dashboard
export const getAgentRequestStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate as string) };
    }
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate as string) };
    }

    // Get total counts by status
    const statusCounts = await AgentRequest.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get outcome statistics
    const outcomeCounts = await AgentRequest.aggregate([
      { $match: { ...dateFilter, outcome: { $exists: true, $ne: 'pending' } } },
      {
        $group: {
          _id: '$outcome',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate success rate
    const totalCompleted = await AgentRequest.countDocuments({
      ...dateFilter,
      status: { $in: ['completed', 'cancelled'] },
    });
    const successCount = await AgentRequest.countDocuments({
      ...dateFilter,
      outcome: 'success',
    });
    const successRate = totalCompleted > 0 ? (successCount / totalCompleted) * 100 : 0;

    // Get recent requests
    const recentRequests = await AgentRequest.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('assignedAgents', 'agentId userId')
      .populate('contactedBy', 'agentId userId');

    // Get location distribution
    const locationStats = await AgentRequest.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get average emails sent
    const emailStats = await AgentRequest.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          avgEmails: { $avg: '$emailsSent' },
          totalEmails: { $sum: '$emailsSent' },
        },
      },
    ]);

    // Total count
    const totalRequests = await AgentRequest.countDocuments(dateFilter);

    res.json({
      stats: {
        total: totalRequests,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byOutcome: outcomeCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        successRate: Math.round(successRate * 10) / 10,
        avgEmailsSent: emailStats[0]?.avgEmails?.toFixed(1) || 0,
        totalEmailsSent: emailStats[0]?.totalEmails || 0,
        topLocations: locationStats,
      },
      recentRequests,
    });
  } catch (error) {
    apiLogger.error('Error fetching agent request stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
