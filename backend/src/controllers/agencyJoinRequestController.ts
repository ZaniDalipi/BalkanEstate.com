import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AgencyJoinRequest from '../models/AgencyJoinRequest';
import Agency from '../models/Agency';
import User, { IUser } from '../models/User';
import Agent from '../models/Agent';
import { getSocketInstance } from '../utils/socketInstance';
import { agencyLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';
import { syncAgentAttributesToAgency } from '../services/agencyAttributeSyncService';
import { createNotificationWithPush } from '../services/engagementService';
import { sendAgentJoinedAgencyEmail, sendAgencyNewMemberEmail } from '../services/emailService';

// Create a join request
export const createJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { agencyId, message, invitationCode } = req.body;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const agentId = String((req.user as IUser)._id);

    // Check if user is an agent
    const user = await User.findById(agentId);
    if (!user || user.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can request to join agencies' });
      return;
    }

    // Check if user has an active Pro subscription (only 'pro' tier qualifies, not 'buyer' or others)
    const userTier = user.subscription?.tier;
    const userSubStatus = user.subscription?.status;
    const hasProSubscription =
      userTier === 'pro' &&
      (userSubStatus === 'active' || userSubStatus === 'trial');

    if (!hasProSubscription) {
      res.status(403).json({
        message: 'Pro subscription required to join an agency. Please upgrade your plan.',
      });
      return;
    }

    // Check if agent already belongs to an agency
    if (user.agencyId) {
      res.status(400).json({ message: 'You already belong to an agency' });
      return;
    }

    // Check if agency exists
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // If invitation code is provided, validate it
    if (invitationCode) {
      if (agency.invitationCode !== invitationCode) {
        res.status(400).json({ message: 'Invalid invitation code' });
        return;
      }
    }

    // Check for existing pending request
    const existingRequest = await AgencyJoinRequest.findOne({
      agentId,
      agencyId,
      status: 'pending',
    });

    if (existingRequest) {
      res.status(400).json({ message: 'You already have a pending request to this agency' });
      return;
    }

    // Create join request with requester and agency details
    const joinRequest = new AgencyJoinRequest({
      agentId,
      agencyId,
      message,
      invitationCode,
      status: 'pending',
      requesterEmail: user.email,
      requesterName: user.name,
      agencyEmail: agency.email,
      agencyName: agency.name,
    });

    await joinRequest.save();

    // Emit socket event to notify agency owner/admins in real-time
    const io = getSocketInstance();
    if (io) {
      io.emit(`agency-update-${String(agencyId)}`, {
        type: 'join-request-new',
        agencyId: String(agencyId),
        joinRequest: {
          _id: String(joinRequest._id),
          agentId: String(agentId),
          requesterName: user.name,
          requesterEmail: user.email,
          message,
          status: 'pending',
          requestedAt: joinRequest.requestedAt,
        },
      });
    }

    // Create notification for agency owner
    try {
      const codeInfo = invitationCode ? ` with invitation code: ${invitationCode}` : '';
      await createNotificationWithPush({
        userId: agency.ownerId,
        type: 'agency_join_request',
        title: 'New Join Request',
        message: `${user.name} has requested to join ${agency.name}${codeInfo}`,
        priority: 'high',
        data: {
          agencyId: String(agencyId),
          agencyName: agency.name,
          agencySlug: agency.slug,
          agentId: String(agentId),
          agentName: user.name,
          agentEmail: user.email,
          joinRequestId: String(joinRequest._id),
          actionLabel: 'Review Request',
        },
      });
    } catch (notifErr) {
      agencyLogger.error('Error creating join request notification:', notifErr);
    }

    res.status(201).json({
      message: 'Join request sent successfully',
      joinRequest,
    });
  } catch (error) {
    agencyLogger.error('Error creating join request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get join requests for an agency (for agency owner)
export const getAgencyJoinRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    // Check if user owns the agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    if (agency.ownerId.toString() !== userId) {
      res.status(403).json({ message: 'Only agency owner can view join requests' });
      return;
    }

    // Get all join requests for this agency
    const joinRequests = await AgencyJoinRequest.find({ agencyId })
      .populate('agentId', 'name email phone avatarUrl avatarOptions gender licenseNumber totalSalesValue propertiesSold')
      .sort({ requestedAt: -1 });

    res.json({ joinRequests });
  } catch (error) {
    agencyLogger.error('Error fetching join requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get join requests for an agent (their own requests)
export const getAgentJoinRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const joinRequests = await AgencyJoinRequest.find({ agentId: userId })
      .populate('agencyId', 'name logo email phone city country')
      .sort({ requestedAt: -1 });

    res.json({ joinRequests });
  } catch (error) {
    agencyLogger.error('Error fetching agent join requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve a join request
export const approveJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = getObjectIdParam(req, res, 'requestId');
    if (!requestId) return;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const joinRequest = await AgencyJoinRequest.findById(requestId);
    if (!joinRequest) {
      res.status(404).json({ message: 'Join request not found' });
      return;
    }

    // Check if user owns the agency
    const agency = await Agency.findById(joinRequest.agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    if (agency.ownerId.toString() !== userId) {
      res.status(403).json({ message: 'Only agency owner can approve requests' });
      return;
    }

    if (joinRequest.status !== 'pending') {
      res.status(400).json({ message: 'This request has already been processed' });
      return;
    }

    // Update agent's agency
    const agent = await User.findById(joinRequest.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Re-validate that agent still has an active Pro subscription (only 'pro' tier, not 'buyer')
    const agentTier = agent.subscription?.tier;
    const agentSubStatus = agent.subscription?.status;
    const agentHasPro =
      agentTier === 'pro' &&
      (agentSubStatus === 'active' || agentSubStatus === 'trial');

    if (!agentHasPro) {
      res.status(403).json({
        message: 'This agent no longer has an active Pro subscription and cannot join the agency.',
      });
      return;
    }

    // Check if agent already joined another agency
    if (agent.agencyId) {
      res.status(400).json({ message: 'Agent has already joined another agency' });
      return;
    }

    agent.agencyId = joinRequest.agencyId;
    agent.agencyName = agency.name;
    await agent.save();

    // Update Agent model as well
    const agentProfile = await Agent.findOne({ userId: joinRequest.agentId });
    if (agentProfile) {
      agentProfile.agencyId = joinRequest.agencyId;
      agentProfile.agencyName = agency.name;
      await agentProfile.save();
    }

    // Add agent to agency's agents array
    if (!agency.agents.includes(joinRequest.agentId)) {
      agency.agents.push(joinRequest.agentId);
      agency.totalAgents = agency.agents.length;

      // Add to agentDetails for tracking join order
      if (!agency.agentDetails) {
        agency.agentDetails = [];
      }
      agency.agentDetails.push({
        userId: joinRequest.agentId,
        joinedAt: new Date(),
        isActive: true,
      } as any);

      await agency.save();
    }

    // Update join request
    joinRequest.status = 'approved';
    joinRequest.respondedAt = new Date();
    joinRequest.respondedBy = new mongoose.Types.ObjectId(userId);
    await joinRequest.save();

    // Sync agent's attributes (languages, service areas, specializations, certifications) to agency
    await syncAgentAttributesToAgency(agency, joinRequest.agentId);

    // Auto-reject all other pending requests from this agent
    await AgencyJoinRequest.updateMany(
      {
        agentId: joinRequest.agentId,
        status: 'pending',
        _id: { $ne: joinRequest._id },
      },
      {
        status: 'rejected',
        respondedAt: new Date(),
        respondedBy: new mongoose.Types.ObjectId(userId),
      }
    );

    // Emit socket event to notify the agent in real-time
    const io = getSocketInstance();
    if (io) {
      // Notify the agent who joined
      io.emit(`user-update-${String(joinRequest.agentId)}`, {
        type: 'agency-joined',
        message: `You have been accepted to ${agency.name}!`,
        user: {
          id: String(agent._id),
          agencyId: String(agent.agencyId),
          agencyName: agent.agencyName,
        },
        agency: {
          id: String(agency._id),
          name: agency.name,
          logo: agency.logo,
          city: agency.city,
          country: agency.country,
        },
      });

      // Notify all viewers of the agency page that the member list has changed
      io.emit(`agency-update-${String(agency._id)}`, {
        type: 'member-added',
        agencyId: String(agency._id),
        agentId: String(agent._id),
        agentName: agent.name,
      });
    }

    // Send email notifications (non-blocking)
    try {
      await sendAgentJoinedAgencyEmail({
        agentEmail: agent.email,
        agentName: agent.name || 'Agent',
        agencyName: agency.name,
        agencyId: String(agency._id),
        subscriptionTier: agent.subscription?.tier || 'pro',
        listingsLimit: agent.subscription?.listingsLimit || 50,
        expiresAt: agent.subscription?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      // Notify agency owner about the new member
      const owner = await User.findById(agency.ownerId);
      if (owner) {
        await sendAgencyNewMemberEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || 'Agency Owner',
          newAgentName: agent.name || 'Agent',
          newAgentEmail: agent.email,
          agencyName: agency.name,
          agencyId: String(agency._id),
          couponCode: '',
          totalAgents: agency.agents.length,
        });
      }
    } catch (emailError) {
      agencyLogger.error('Error sending join approval emails:', emailError);
    }

    res.json({
      message: 'Join request approved successfully',
      joinRequest,
    });
  } catch (error) {
    agencyLogger.error('Error approving join request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a join request
export const rejectJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = getObjectIdParam(req, res, 'requestId');
    if (!requestId) return;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const joinRequest = await AgencyJoinRequest.findById(requestId);
    if (!joinRequest) {
      res.status(404).json({ message: 'Join request not found' });
      return;
    }

    // Check if user owns the agency
    const agency = await Agency.findById(joinRequest.agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    if (agency.ownerId.toString() !== userId) {
      res.status(403).json({ message: 'Only agency owner can reject requests' });
      return;
    }

    if (joinRequest.status !== 'pending') {
      res.status(400).json({ message: 'This request has already been processed' });
      return;
    }

    // Update join request
    joinRequest.status = 'rejected';
    joinRequest.respondedAt = new Date();
    joinRequest.respondedBy = new mongoose.Types.ObjectId(userId);
    await joinRequest.save();

    res.json({
      message: 'Join request rejected',
      joinRequest,
    });
  } catch (error) {
    agencyLogger.error('Error rejecting join request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel a join request (by the agent)
export const cancelJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = getObjectIdParam(req, res, 'requestId');
    if (!requestId) return;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const joinRequest = await AgencyJoinRequest.findById(requestId);
    if (!joinRequest) {
      res.status(404).json({ message: 'Join request not found' });
      return;
    }

    // Check if user is the agent who made the request
    if (joinRequest.agentId.toString() !== userId) {
      res.status(403).json({ message: 'You can only cancel your own requests' });
      return;
    }

    if (joinRequest.status !== 'pending') {
      res.status(400).json({ message: 'Only pending requests can be cancelled' });
      return;
    }

    await joinRequest.deleteOne();

    res.json({ message: 'Join request cancelled successfully' });
  } catch (error) {
    agencyLogger.error('Error cancelling join request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join agency using invitation code
export const joinByInvitationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationCode, message } = req.body;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const agentId = String((req.user as IUser)._id);

    // Check if user is an agent
    const user = await User.findById(agentId);
    if (!user || user.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can join agencies' });
      return;
    }

    // Check if user has an active Pro subscription (only 'pro' tier qualifies, not 'buyer' or others)
    const userTier = user.subscription?.tier;
    const userSubStatus = user.subscription?.status;
    const hasProSubscription =
      userTier === 'pro' &&
      (userSubStatus === 'active' || userSubStatus === 'trial');

    if (!hasProSubscription) {
      res.status(403).json({
        message: 'Pro subscription required to join an agency. Please upgrade your plan.',
      });
      return;
    }

    // Check if agent already belongs to an agency
    if (user.agencyId) {
      res.status(400).json({ message: 'You already belong to an agency' });
      return;
    }

    // Find agency by invitation code (case-insensitive)
    const agency = await Agency.findOne({ invitationCode: invitationCode.toUpperCase() });
    if (!agency) {
      res.status(404).json({ message: 'Invalid invitation code' });
      return;
    }

    // Check for existing pending request
    const existingRequest = await AgencyJoinRequest.findOne({
      agentId,
      agencyId: agency._id,
      status: 'pending',
    });

    if (existingRequest) {
      res.status(400).json({ message: 'You already have a pending request to this agency' });
      return;
    }

    // Create join request with invitation code
    const joinRequest = new AgencyJoinRequest({
      agentId,
      agencyId: agency._id,
      message,
      invitationCode,
      status: 'pending',
      requesterEmail: user.email,
      requesterName: user.name,
      agencyEmail: agency.email,
      agencyName: agency.name,
    });

    await joinRequest.save();

    // Emit socket event to notify agency owner
    const io = getSocketInstance();
    if (io) {
      io.emit(`agency-update-${String(agency._id)}`, {
        type: 'join-request-new',
        agencyId: String(agency._id),
        joinRequest: {
          _id: String(joinRequest._id),
          agentId: String(agentId),
          requesterName: user.name,
          requesterEmail: user.email,
          message,
          status: 'pending',
          requestedAt: joinRequest.requestedAt,
        },
      });
    }

    // Create notification for agency owner
    try {
      await createNotificationWithPush({
        userId: agency.ownerId,
        type: 'agency_join_request',
        title: 'New Join Request',
        message: `${user.name} has requested to join ${agency.name} with invitation code: ${invitationCode}`,
        priority: 'high',
        data: {
          agencyId: String(agency._id),
          agencyName: agency.name,
          agencySlug: agency.slug,
          agentId: String(agentId),
          agentName: user.name,
          agentEmail: user.email,
          joinRequestId: String(joinRequest._id),
          actionLabel: 'Review Request',
        },
      });
    } catch (notifErr) {
      agencyLogger.error('Error creating join request notification:', notifErr);
    }

    res.status(201).json({
      message: 'Join request sent successfully',
      joinRequest,
      agency: {
        id: agency._id,
        name: agency.name,
        logo: agency.logo,
        city: agency.city,
        country: agency.country,
      },
    });
  } catch (error) {
    agencyLogger.error('Error joining by invitation code:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
