import { Request, Response } from 'express';
import Agent, { ICredential } from '../models/Agent';
import { IUser } from '../models/User';
import { uploadImage, deleteImages } from '../services/cloudinaryService';
import { apiLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';

// @desc    Get agent credentials
// @route   GET /api/credentials
// @access  Private
export const getCredentials = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const agent = await Agent.findOne({ userId: String(currentUser._id) });

    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    res.json({
      success: true,
      credentials: agent.credentials || [],
    });
  } catch (error: any) {
    apiLogger.error('Get credentials error:', error);
    res.status(500).json({ message: 'Error fetching credentials' });
  }
};

// @desc    Add a new credential
// @route   POST /api/credentials
// @access  Private (agents only)
export const addCredential = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can add credentials' });
      return;
    }

    const agent = await Agent.findOne({ userId: String(currentUser._id) });

    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    const {
      type,
      title,
      issuer,
      issueNumber,
      issueDate,
      expiryDate,
      isPublic,
    } = req.body;

    if (!type || !title || !issuer) {
      res.status(400).json({ message: 'Type, title, and issuer are required' });
      return;
    }

    // Validate type
    const validTypes = ['license', 'certification', 'award', 'membership'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ message: 'Invalid credential type' });
      return;
    }

    // Upload document if provided
    // Path: balkan-estate/users/{userId}/documents/credentials/
    let documentUrl: string | undefined;
    let documentPublicId: string | undefined;

    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, {
        userId: String(currentUser._id),
        type: 'credential',
        maxWidth: 2000,
        maxHeight: 2000,
      });
      documentUrl = uploadResult.url;
      documentPublicId = uploadResult.publicId;
    }

    const newCredential: Partial<ICredential> = {
      type,
      title,
      issuer,
      issueNumber: issueNumber || undefined,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      documentUrl,
      documentPublicId,
      status: 'pending',
      isPublic: isPublic !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    agent.credentials.push(newCredential as ICredential);
    await agent.save();

    const addedCredential = agent.credentials[agent.credentials.length - 1];

    // Credential added successfully

    res.status(201).json({
      success: true,
      message: 'Credential added successfully',
      credential: addedCredential,
    });
  } catch (error: any) {
    apiLogger.error('Add credential error:', error);
    res.status(500).json({ message: 'Error adding credential' });
  }
};

// @desc    Update a credential
// @route   PUT /api/credentials/:credentialId
// @access  Private (agents only)
export const updateCredential = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const credentialId = getObjectIdParam(req, res, 'credentialId');
    if (!credentialId) return;

    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can update credentials' });
      return;
    }

    const agent = await Agent.findOne({ userId: String(currentUser._id) });

    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    const credentialIndex = agent.credentials.findIndex(
      (c: any) => c._id.toString() === credentialId
    );

    if (credentialIndex === -1) {
      res.status(404).json({ message: 'Credential not found' });
      return;
    }

    const {
      title,
      issuer,
      issueNumber,
      issueDate,
      expiryDate,
      isPublic,
    } = req.body;

    // Update fields if provided
    if (title) agent.credentials[credentialIndex].title = title;
    if (issuer) agent.credentials[credentialIndex].issuer = issuer;
    if (issueNumber !== undefined) agent.credentials[credentialIndex].issueNumber = issueNumber;
    if (issueDate !== undefined) agent.credentials[credentialIndex].issueDate = issueDate ? new Date(issueDate) : undefined;
    if (expiryDate !== undefined) agent.credentials[credentialIndex].expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (isPublic !== undefined) agent.credentials[credentialIndex].isPublic = isPublic;

    // Handle document upload if new file provided
    // Path: balkan-estate/users/{userId}/documents/credentials/
    if (req.file) {
      // Delete old document if exists
      if (agent.credentials[credentialIndex].documentPublicId) {
        await deleteImages([agent.credentials[credentialIndex].documentPublicId!]);
      }

      const uploadResult = await uploadImage(req.file.buffer, {
        userId: String(currentUser._id),
        type: 'credential',
        maxWidth: 2000,
        maxHeight: 2000,
      });
      agent.credentials[credentialIndex].documentUrl = uploadResult.url;
      agent.credentials[credentialIndex].documentPublicId = uploadResult.publicId;
    }

    agent.credentials[credentialIndex].updatedAt = new Date();
    // Reset status to pending if credential was modified
    agent.credentials[credentialIndex].status = 'pending';

    await agent.save();

    // Credential updated successfully

    res.json({
      success: true,
      message: 'Credential updated successfully',
      credential: agent.credentials[credentialIndex],
    });
  } catch (error: any) {
    apiLogger.error('Update credential error:', error);
    res.status(500).json({ message: 'Error updating credential' });
  }
};

// @desc    Delete a credential
// @route   DELETE /api/credentials/:credentialId
// @access  Private (agents only)
export const deleteCredential = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const credentialId = getObjectIdParam(req, res, 'credentialId');
    if (!credentialId) return;

    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can delete credentials' });
      return;
    }

    const agent = await Agent.findOne({ userId: String(currentUser._id) });

    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    const credentialIndex = agent.credentials.findIndex(
      (c: any) => c._id.toString() === credentialId
    );

    if (credentialIndex === -1) {
      res.status(404).json({ message: 'Credential not found' });
      return;
    }

    // Delete document from Cloudinary if exists
    if (agent.credentials[credentialIndex].documentPublicId) {
      await deleteImages([agent.credentials[credentialIndex].documentPublicId!]);
    }

    agent.credentials.splice(credentialIndex, 1);
    await agent.save();

    // Credential deleted successfully

    res.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error: any) {
    apiLogger.error('Delete credential error:', error);
    res.status(500).json({ message: 'Error deleting credential' });
  }
};

// @desc    Get public credentials for an agent (for public profile view)
// @route   GET /api/credentials/agent/:agentId
// @access  Public
export const getAgentPublicCredentials = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = getObjectIdParam(req, res, 'agentId');
    if (!agentId) return;

    const agent = await Agent.findById(agentId);

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Filter to only public and verified/pending credentials
    const publicCredentials = (agent.credentials || []).filter(
      (c: ICredential) => c.isPublic && c.status !== 'rejected'
    );

    res.json({
      success: true,
      credentials: publicCredentials,
    });
  } catch (error: any) {
    apiLogger.error('Get agent public credentials error:', error);
    res.status(500).json({ message: 'Error fetching credentials' });
  }
};
