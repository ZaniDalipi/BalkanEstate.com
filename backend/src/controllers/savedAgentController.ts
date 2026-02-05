import { Request, Response } from 'express';
import SavedAgent from '../models/SavedAgent';
import Agent from '../models/Agent';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';

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
          select: 'name email phone avatarUrl',
        },
      })
      .sort({ createdAt: -1 });

    // Filter out any null agents (in case they were deleted)
    const validSavedAgents = savedAgents.filter((saved) => saved.agentId != null);

    res.json({ savedAgents: validSavedAgents });
  } catch (error: any) {
    apiLogger.error('Get saved agents error:', error);
    res.status(500).json({ message: 'Error fetching saved agents', error: error.message });
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

    const { agentId } = req.body;

    if (!agentId) {
      res.status(400).json({ message: 'Agent ID is required' });
      return;
    }

    // Check if agent exists
    const agent = await Agent.findById(agentId);

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Check if already saved
    const existingSavedAgent = await SavedAgent.findOne({
      userId: String((req.user as IUser)._id),
      agentId,
    });

    if (existingSavedAgent) {
      // Remove saved agent
      await existingSavedAgent.deleteOne();
      res.json({ message: 'Agent unsaved', isSaved: false });
    } else {
      // Add saved agent
      await SavedAgent.create({
        userId: String((req.user as IUser)._id),
        agentId,
      });
      res.json({ message: 'Agent saved', isSaved: true });
    }
  } catch (error: any) {
    apiLogger.error('Toggle saved agent error:', error);
    res.status(500).json({ message: 'Error toggling saved agent', error: error.message });
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

    const savedAgent = await SavedAgent.findOne({
      userId: String((req.user as IUser)._id),
      agentId: req.params.agentId,
    });

    res.json({ isSaved: !!savedAgent });
  } catch (error: any) {
    apiLogger.error('Check saved agent error:', error);
    res.status(500).json({ message: 'Error checking saved agent', error: error.message });
  }
};
