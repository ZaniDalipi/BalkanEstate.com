import { Request, Response } from 'express';
import Agent from '../models/Agent';
import User, { IUser } from '../models/User';
import Agency from '../models/Agency';
import Conversation from '../models/Conversation';
import { getSocketInstance } from '../utils/socketInstance';



// @desc    Get all agents
// @route   GET /api/agents
// @access  Public
export const getAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const agents = await Agent.find({ isActive: true })
      .populate('userId', 'name email phone avatarUrl city country')
      .populate('agencyId', 'name logo coverGradient coverImage slug type')
      .populate('testimonials.userId', 'name avatarUrl')
      .sort({ rating: -1, totalSales: -1 });

    res.json({ agents });
  } catch (error: any) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Error fetching agents', error: error.message });
  }
};

// @desc    Get single agent by ID
// @route   GET /api/agents/:id
// @access  Public
export const getAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('userId', 'name email phone avatarUrl city country')
      .populate('testimonials.userId', 'name avatarUrl');

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    res.json({ agent });
  } catch (error: any) {
    console.error('Get agent error:', error);
    res.status(500).json({ message: 'Error fetching agent', error: error.message });
  }
};

// @desc    Get agent by user ID
// @route   GET /api/agents/user/:userId
// @access  Public
export const getAgentByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const agent = await Agent.findOne({ userId: req.params.userId })
      .populate('userId', 'name email phone avatarUrl city country')
      .populate('testimonials.userId', 'name avatarUrl');

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    res.json({ agent });
  } catch (error: any) {
    console.error('Get agent by user ID error:', error);
    res.status(500).json({ message: 'Error fetching agent', error: error.message });
  }
};

// @desc    Update agent profile
// @route   PUT /api/agents/profile
// @access  Private
export const updateAgentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Check if user is an agent
    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can update agent profile' });
      return;
    }

    const agent = await Agent.findOne({ userId: String(currentUser._id) });

    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    // Update allowed fields
    const {
      bio,
      specializations,
      yearsOfExperience,
      languages,
      serviceAreas,
      lat,
      lng,
      websiteUrl,
      facebookUrl,
      instagramUrl,
      linkedinUrl,
      officeAddress,
      officePhone,
    } = req.body;

    if (bio !== undefined) agent.bio = bio;
    if (specializations !== undefined) agent.specializations = specializations;
    if (yearsOfExperience !== undefined) agent.yearsOfExperience = yearsOfExperience;
    if (languages !== undefined) agent.languages = languages;
    if (serviceAreas !== undefined) agent.serviceAreas = serviceAreas;
    if (lat !== undefined) agent.lat = lat;
    if (lng !== undefined) agent.lng = lng;
    if (websiteUrl !== undefined) agent.websiteUrl = websiteUrl;
    if (facebookUrl !== undefined) agent.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) agent.instagramUrl = instagramUrl;
    if (linkedinUrl !== undefined) agent.linkedinUrl = linkedinUrl;
    if (officeAddress !== undefined) agent.officeAddress = officeAddress;
    if (officePhone !== undefined) agent.officePhone = officePhone;

    await agent.save();

    res.json({
      message: 'Agent profile updated successfully',
      agent,
    });
  } catch (error: any) {
    console.error('Update agent profile error:', error);
    res.status(500).json({ message: 'Error updating agent profile', error: error.message });
  }
};

// @desc    Add review/rating to agent
// @route   POST /api/agents/:id/reviews
// @access  Private (authenticated users only)
export const addReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const { quote, rating, propertyId } = req.body;

    if (!quote || !rating) {
      res.status(400).json({ message: 'Review text and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Prevent agents from reviewing themselves
    if (agent.userId.toString() === String(currentUser._id)) {
      res.status(400).json({ message: 'You cannot review yourself' });
      return;
    }

    // Check if user already reviewed this agent
    const existingReview = agent.testimonials.find(
      (t: any) => t.userId && t.userId.toString() === String(currentUser._id)
    );

    if (existingReview) {
      res.status(400).json({ message: 'You have already reviewed this agent' });
      return;
    }

    // Check if user has had a conversation with this agent
    const hasWorkedTogether = await Conversation.findOne({
      $or: [
        { buyerId: currentUser._id, sellerId: agent.userId },
        { buyerId: agent.userId, sellerId: currentUser._id }
      ]
    });

    if (!hasWorkedTogether) {
      res.status(403).json({
        message: 'You can only review agents you have worked with. Start a conversation about a property first.'
      });
      return;
    }

    // Add review with user information
    agent.testimonials.push({
      clientName: currentUser.name,
      userId: currentUser._id as any,
      quote,
      rating,
      propertyId: propertyId || undefined,
      createdAt: new Date(),
    });

    await agent.save();

    // Populate testimonials with user data before sending response
    await agent.populate('testimonials.userId', 'name avatarUrl');

    res.json({
      message: 'Review added successfully',
      agent,
    });
  } catch (error: any) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
};

// @desc    Add testimonial to agent (DEPRECATED - Use addReview instead)
// @route   POST /api/agents/:id/testimonials
// @access  Private
export const addTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { clientName, quote, rating, propertyId } = req.body;

    if (!clientName || !quote || !rating) {
      res.status(400).json({ message: 'Client name, quote, and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    agent.testimonials.push({
      clientName,
      quote,
      rating,
      propertyId: propertyId || undefined,
      createdAt: new Date(),
    });

    await agent.save();

    res.json({
      message: 'Testimonial added successfully',
      agent,
    });
  } catch (error: any) {
    console.error('Add testimonial error:', error);
    res.status(500).json({ message: 'Error adding testimonial', error: error.message });
  }
};

// @desc    Update agent statistics (called internally)
// @route   Internal use only
export const updateAgentStats = async (
  userId: string,
  updates: {
    activeListings?: number;
    totalSales?: number;
    totalSalesValue?: number;
  }
): Promise<void> => {
  try {
    const agent = await Agent.findOne({ userId });

    if (!agent) {
      console.warn(`Agent not found for user ${userId}`);
      return;
    }

    if (updates.activeListings !== undefined) {
      agent.activeListings = updates.activeListings;
    }

    if (updates.totalSales !== undefined) {
      agent.totalSales += updates.totalSales;
    }

    if (updates.totalSalesValue !== undefined) {
      agent.totalSalesValue += updates.totalSalesValue;
    }

    await agent.save();
  } catch (error: any) {
    console.error('Update agent stats error:', error);
  }
};

// @desc    Leave agency
// @route   POST /api/agents/leave-agency
// @access  Private (agent only)
export const leaveAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Check if user is an agent
    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can leave agencies' });
      return;
    }

    // Get user from database to ensure we have the latest data
    const user = await User.findById(String(currentUser._id));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if agent is part of an agency
    if (!user.agencyId) {
      res.status(400).json({ message: 'You are not part of any agency' });
      return;
    }

    const agencyId = user.agencyId;
    const agencyName = user.agencyName;

    // Update User model
    user.agencyName = 'Independent Agent';
    user.agencyId = undefined;
    await user.save();

    // Update Agent model
    const agentProfile = await Agent.findOne({ userId: String(currentUser._id) });
    if (agentProfile) {
      agentProfile.agencyName = 'Independent Agent';
      agentProfile.agencyId = undefined;
      await agentProfile.save();
    }

    // Remove agent from agency's agents array and mark as inactive in agentDetails
    const agency = await Agency.findById(agencyId);
    if (agency) {
      agency.agents = agency.agents.filter(
        (id) => id.toString() !== String(currentUser._id)
      );
      agency.totalAgents = agency.agents.length;

      // Mark agent as inactive in agentDetails (preserve join history)
      if (agency.agentDetails) {
        const agentDetail = agency.agentDetails.find(
          (ad: any) => ad.userId.toString() === String(currentUser._id)
        );
        if (agentDetail) {
          agentDetail.isActive = false;
          agentDetail.leftAt = new Date();
        }
      }

      // Recalculate agency languages from remaining active agents
      if (agency.agents.length > 0) {
        const remainingAgents = await Agent.find({ userId: { $in: agency.agents } });
        const allLanguages = remainingAgents.flatMap(a => a.languages || []);
        agency.languages = [...new Set(allLanguages)];
      } else {
        agency.languages = [];
      }

      await agency.save();

      // Emit socket event to notify agency members
      const io = getSocketInstance();
      if (io) {
        // Notify the agent who left
        io.emit(`user-update-${String(currentUser._id)}`, {
          type: 'agency-left',
          message: `You have left ${agencyName}`,
          user: {
            id: String(user._id),
            agencyId: null,
            agencyName: 'Independent Agent',
          },
        });
        console.log(`✅ Socket event emitted to agent ${currentUser._id} for leaving agency`);

        // Notify all viewers of the agency page that a member has left
        io.emit(`agency-update-${String(agencyId)}`, {
          type: 'member-removed',
          agencyId: String(agencyId),
          agentId: String(currentUser._id),
          agentName: user.name,
        });
        console.log(`✅ Socket event emitted to agency ${agencyId} for member removal`);
      }
    }

    res.json({
      message: 'Successfully left the agency',
      user: {
        id: String(user._id),
        agencyId: null,
        agencyName: 'Independent Agent',
      },
    });
  } catch (error: any) {
    console.error('Leave agency error:', error);
    res.status(500).json({ message: 'Error leaving agency', error: error.message });
  }
};
