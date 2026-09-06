import { Request, Response } from 'express';
import SavedAgent from '../models/SavedAgent';
import Agent from '../models/Agent';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { isValidObjectId } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';

// @desc    Get user's saved agents
// @route   GET /api/saved-agents
// @access  Private
export const getSavedAgents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = req.user as IUser;
    const savedAgents = await SavedAgent.find({ userId: String(user._id) })
      .populate({
        path: 'agentId',
        populate: {
          path: 'userId',
          select: 'name email phone avatarUrl avatarOptions gender',
        },
      })
      .sort({ createdAt: -1 });

    // Filter out any null agents (in case they were deleted)
    const validSavedAgents = savedAgents.filter((saved) => saved.agentId != null);

    res.json({ savedAgents: validSavedAgents });
  } catch (error: any) {
    apiLogger.error('Get saved agents error:', error);
    res.status(500).json({ message: 'Error fetching saved agents' });
  }
};

// @desc    Toggle saved agent (add or remove)
// @route   POST /api/saved-agents/toggle
// @access  Private
export const toggleSavedAgent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { agentId: rawAgentId } = req.body;

    if (!rawAgentId) {
      res.status(400).json({ message: 'Agent ID is required' });
      return;
    }

    // Resolve obfuscated/encoded IDs back to raw hex ObjectIds
    const resolvedId = resolveId(rawAgentId);

    // Check if agent exists - support raw ObjectId, obfuscated ID, custom agentId slug
    let agent = null;
    if (resolvedId && isValidObjectId(resolvedId)) {
      agent = await Agent.findById(resolvedId);
      if (!agent) {
        agent = await Agent.findOne({ userId: resolvedId });
      }
    }
    if (!agent) {
      agent = await Agent.findOne({ agentId: rawAgentId });
    }

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Always use the agent's MongoDB _id for the saved record
    const agentObjectId = agent._id;

    // Check if already saved
    const existingSavedAgent = await SavedAgent.findOne({
      userId: String((req.user as IUser)._id),
      agentId: agentObjectId,
    });

    if (existingSavedAgent) {
      // Remove saved agent
      await existingSavedAgent.deleteOne();
      res.json({ message: 'Agent unsaved', isSaved: false });
    } else {
      // Add saved agent
      await SavedAgent.create({
        userId: String((req.user as IUser)._id),
        agentId: agentObjectId,
      });
      res.json({ message: 'Agent saved', isSaved: true });
    }
  } catch (error: any) {
    apiLogger.error('Toggle saved agent error:', error);
    res.status(500).json({ message: 'Error toggling saved agent' });
  }
};

// @desc    Check if agent is saved
// @route   GET /api/saved-agents/check/:agentId
// @access  Private
export const checkSavedAgent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const rawParamId = req.params.agentId as string;
    if (!rawParamId) {
      res.status(400).json({ message: 'Agent ID is required' });
      return;
    }

    // Resolve obfuscated/encoded IDs back to raw hex ObjectIds
    const resolvedId = resolveId(rawParamId);

    // Resolve the agent's MongoDB _id (supports raw ObjectId, obfuscated ID, custom agentId slug)
    let agent = null;
    if (resolvedId && isValidObjectId(resolvedId)) {
      agent = await Agent.findById(resolvedId).select('_id');
      if (!agent) {
        agent = await Agent.findOne({ userId: resolvedId }).select('_id');
      }
    }
    if (!agent) {
      agent = await Agent.findOne({ agentId: rawParamId }).select('_id');
    }

    if (!agent) {
      res.json({ isSaved: false });
      return;
    }

    const savedAgent = await SavedAgent.findOne({
      userId: String((req.user as IUser)._id),
      agentId: agent._id,
    });

    res.json({ isSaved: !!savedAgent });
  } catch (error: any) {
    apiLogger.error('Check saved agent error:', error);
    res.status(500).json({ message: 'Error checking saved agent' });
  }
};
