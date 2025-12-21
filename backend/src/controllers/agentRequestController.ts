import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AgentRequest from '../models/AgentRequest';
import Agent from '../models/Agent';

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

    // Find nearby agents based on location
    // Parse location to extract city/country
    const locationLower = location.toLowerCase();

    // Try to find agents in the same area
    const nearbyAgents = await Agent.find({
      $or: [
        { city: { $regex: locationLower, $options: 'i' } },
        { country: { $regex: locationLower, $options: 'i' } },
      ],
      licenseVerified: true, // Only verified agents
    })
      .sort({ propertiesSold: -1 }) // Prioritize agents with more sales
      .limit(5)
      .select('_id agentId userId');

    // Assign nearby agents to the request
    if (nearbyAgents.length > 0) {
      agentRequest.assignedAgents = nearbyAgents.map(agent => agent._id as mongoose.Types.ObjectId);
      agentRequest.status = 'assigned';
      await agentRequest.save();
    }

    res.status(201).json({
      message: 'Request submitted successfully',
      agentRequest: {
        id: agentRequest._id,
        email: agentRequest.email,
        location: agentRequest.location,
        status: agentRequest.status,
        assignedAgents: nearbyAgents.map(agent => ({
          agentId: agent.agentId,
          userId: agent.userId,
        })),
      },
    });
  } catch (error) {
    console.error('Error creating agent request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
    console.error('Error fetching agent requests:', error);
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
    console.error('Error fetching agent requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update request status
export const updateAgentRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'assigned', 'contacted', 'completed', 'cancelled'].includes(status)) {
       res.status(400).json({ message: 'Invalid status' });
       return;
    }

    const agentRequest = await AgentRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!agentRequest) {
       res.status(404).json({ message: 'Request not found' });
       return;
    }

    res.json({ agentRequest });
  } catch (error) {
    console.error('Error updating agent request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
