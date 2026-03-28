import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Agency from '../models/Agency';
import crypto from 'crypto';
import { apiLogger } from '../utils/logger';
import { getParam, getObjectIdParam } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';

// Generate unique ID for achievements
const generateAchievementId = () => {
  return `ach_${crypto.randomBytes(8).toString('hex')}`;
};

// Validate achievement type
const validTypes = ['award', 'certification', 'milestone', 'recognition', 'membership'];

// @desc    Get user achievements
// @route   GET /api/achievements/user/:userId
// @access  Public
export const getUserAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const user = await User.findById(userId).select('achievements');

    // Return empty array if user not found — achievements are optional data
    if (!user) {
      res.json({ achievements: [] });
      return;
    }

    res.json({ achievements: user.achievements || [] });
  } catch (error: any) {
    apiLogger.error('Error fetching user achievements:', error);
    res.status(500).json({ message: 'Error fetching achievements' });
  }
};

// @desc    Add user achievement
// @route   POST /api/achievements/user
// @access  Private
export const addUserAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Only agents can add achievements
    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can add achievements' });
      return;
    }

    const { type, title, description, dateReceived, expiryDate, issuingOrganization, documentUrl } = req.body;

    // Validate required fields
    if (!type || !title || !dateReceived || !issuingOrganization) {
      res.status(400).json({ message: 'Missing required fields: type, title, dateReceived, issuingOrganization' });
      return;
    }

    // Validate type
    if (!validTypes.includes(type)) {
      res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const newAchievement = {
      id: generateAchievementId(),
      type,
      title,
      description: description || undefined,
      dateReceived: new Date(dateReceived),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      issuingOrganization,
      documentUrl: documentUrl || undefined,
      isVerified: false,
      createdAt: new Date(),
    };

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $push: { achievements: newAchievement } },
      { new: true }
    ).select('achievements');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(201).json({
      message: 'Achievement added successfully',
      achievement: newAchievement,
      achievements: updatedUser.achievements,
    });
  } catch (error: any) {
    apiLogger.error('Error adding user achievement:', error);
    res.status(500).json({ message: 'Error adding achievement' });
  }
};

// @desc    Update user achievement
// @route   PUT /api/achievements/user/:achievementId
// @access  Private
export const updateUserAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;
    const achievementId = getParam(req, 'achievementId');

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { type, title, description, dateReceived, expiryDate, issuingOrganization, documentUrl } = req.body;

    // Validate type if provided
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    // Find the user and update the specific achievement
    const user = await User.findById(currentUser._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // achievementId may be the obfuscated subdocument _id (from toJSON transform)
    const resolvedAchId = resolveId(achievementId);
    const achievementIndex = (user.achievements || []).findIndex(a =>
      resolvedAchId ? String((a as any)._id) === resolvedAchId : (a as any).id === achievementId
    );
    if (achievementIndex === -1) {
      res.status(404).json({ message: 'Achievement not found' });
      return;
    }

    // Update fields
    const achievement = user.achievements![achievementIndex];
    if (type) achievement.type = type;
    if (title) achievement.title = title;
    if (description !== undefined) achievement.description = description || undefined;
    if (dateReceived) achievement.dateReceived = new Date(dateReceived);
    if (expiryDate !== undefined) achievement.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (issuingOrganization) achievement.issuingOrganization = issuingOrganization;
    if (documentUrl !== undefined) achievement.documentUrl = documentUrl || undefined;
    achievement.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Achievement updated successfully',
      achievement,
      achievements: user.achievements,
    });
  } catch (error: any) {
    apiLogger.error('Error updating user achievement:', error);
    res.status(500).json({ message: 'Error updating achievement' });
  }
};

// @desc    Delete user achievement
// @route   DELETE /api/achievements/user/:achievementId
// @access  Private
export const deleteUserAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;
    const achievementId = getParam(req, 'achievementId');

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // achievementId may be the obfuscated subdocument _id (from toJSON transform)
    const resolvedAchId = resolveId(achievementId);
    const pullFilter = resolvedAchId
      ? { _id: new mongoose.Types.ObjectId(resolvedAchId) }
      : { id: achievementId };
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $pull: { achievements: pullFilter } },
      { new: true }
    ).select('achievements');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'Achievement deleted successfully',
      achievements: updatedUser.achievements,
    });
  } catch (error: any) {
    apiLogger.error('Error deleting user achievement:', error);
    res.status(500).json({ message: 'Error deleting achievement' });
  }
};

// ==================== Agency Achievements ====================

// @desc    Get agency achievements
// @route   GET /api/achievements/agency/:agencyId
// @access  Public
export const getAgencyAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    const agency = await Agency.findById(agencyId).select('achievements');

    // Return empty array if agency not found — achievements are optional data
    if (!agency) {
      res.json({ achievements: [] });
      return;
    }

    res.json({ achievements: agency.achievements || [] });
  } catch (error: any) {
    apiLogger.error('Error fetching agency achievements:', error);
    res.status(500).json({ message: 'Error fetching achievements' });
  }
};

// @desc    Add agency achievement
// @route   POST /api/achievements/agency/:agencyId
// @access  Private (Agency owner/admin only)
export const addAgencyAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Find the agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is agency owner or admin
    const isOwner = String(agency.ownerId) === String(currentUser._id);
    const isAdmin = agency.admins?.some(adminId => String(adminId) === String(currentUser._id));

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Only agency owner or admins can add achievements' });
      return;
    }

    const { type, title, description, dateReceived, expiryDate, issuingOrganization, documentUrl } = req.body;

    // Validate required fields
    if (!type || !title || !dateReceived || !issuingOrganization) {
      res.status(400).json({ message: 'Missing required fields: type, title, dateReceived, issuingOrganization' });
      return;
    }

    // Validate type
    if (!validTypes.includes(type)) {
      res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const newAchievement = {
      id: generateAchievementId(),
      type,
      title,
      description: description || undefined,
      dateReceived: new Date(dateReceived),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      issuingOrganization,
      documentUrl: documentUrl || undefined,
      isVerified: false,
      createdAt: new Date(),
    };

    agency.achievements = agency.achievements || [];
    agency.achievements.push(newAchievement as any);
    await agency.save();

    res.status(201).json({
      message: 'Achievement added successfully',
      achievement: newAchievement,
      achievements: agency.achievements,
    });
  } catch (error: any) {
    apiLogger.error('Error adding agency achievement:', error);
    res.status(500).json({ message: 'Error adding achievement' });
  }
};

// @desc    Update agency achievement
// @route   PUT /api/achievements/agency/:agencyId/:achievementId
// @access  Private (Agency owner/admin only)
export const updateAgencyAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const achievementId = getParam(req, 'achievementId');

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Find the agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is agency owner or admin
    const isOwner = String(agency.ownerId) === String(currentUser._id);
    const isAdmin = agency.admins?.some(adminId => String(adminId) === String(currentUser._id));

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Only agency owner or admins can update achievements' });
      return;
    }

    const { type, title, description, dateReceived, expiryDate, issuingOrganization, documentUrl } = req.body;

    // Validate type if provided
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    // achievementId may be the obfuscated subdocument _id (from toJSON transform)
    const resolvedAchId = resolveId(achievementId);
    const achievementIndex = (agency.achievements || []).findIndex((a: any) =>
      resolvedAchId ? String(a._id) === resolvedAchId : a.id === achievementId
    );
    if (achievementIndex === -1) {
      res.status(404).json({ message: 'Achievement not found' });
      return;
    }

    // Update fields
    const achievement = agency.achievements![achievementIndex] as any;
    if (type) achievement.type = type;
    if (title) achievement.title = title;
    if (description !== undefined) achievement.description = description || undefined;
    if (dateReceived) achievement.dateReceived = new Date(dateReceived);
    if (expiryDate !== undefined) achievement.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (issuingOrganization) achievement.issuingOrganization = issuingOrganization;
    if (documentUrl !== undefined) achievement.documentUrl = documentUrl || undefined;
    achievement.updatedAt = new Date();

    await agency.save();

    res.json({
      message: 'Achievement updated successfully',
      achievement,
      achievements: agency.achievements,
    });
  } catch (error: any) {
    apiLogger.error('Error updating agency achievement:', error);
    res.status(500).json({ message: 'Error updating achievement' });
  }
};

// @desc    Delete agency achievement
// @route   DELETE /api/achievements/agency/:agencyId/:achievementId
// @access  Private (Agency owner/admin only)
export const deleteAgencyAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const achievementId = getParam(req, 'achievementId');

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Find the agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is agency owner or admin
    const isOwner = String(agency.ownerId) === String(currentUser._id);
    const isAdmin = agency.admins?.some(adminId => String(adminId) === String(currentUser._id));

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Only agency owner or admins can delete achievements' });
      return;
    }

    // achievementId may be the obfuscated subdocument _id (from toJSON transform)
    const resolvedAchId = resolveId(achievementId);
    agency.achievements = (agency.achievements || []).filter((a: any) =>
      resolvedAchId ? String(a._id) !== resolvedAchId : a.id !== achievementId
    );
    await agency.save();

    res.json({
      message: 'Achievement deleted successfully',
      achievements: agency.achievements,
    });
  } catch (error: any) {
    apiLogger.error('Error deleting agency achievement:', error);
    res.status(500).json({ message: 'Error deleting achievement' });
  }
};

// @desc    Verify an achievement (admin only)
// @route   POST /api/achievements/verify/:type/:entityId/:achievementId
// @access  Private (Admin only)
export const verifyAchievement = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser;
    const type = getParam(req, 'type');
    const entityId = getObjectIdParam(req, res, 'entityId');
    if (!entityId) return;
    const achievementId = getParam(req, 'achievementId');

    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (type === 'user') {
      const user = await User.findById(entityId);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const resolvedAchId = resolveId(achievementId);
      const achievement = (user.achievements || []).find(a =>
        resolvedAchId ? String((a as any)._id) === resolvedAchId : a.id === achievementId
      );
      if (!achievement) {
        res.status(404).json({ message: 'Achievement not found' });
        return;
      }

      achievement.isVerified = true;
      achievement.verifiedAt = new Date();
      achievement.verifiedBy = currentUser._id as any;
      achievement.updatedAt = new Date();

      await user.save();

      res.json({
        message: 'Achievement verified successfully',
        achievement,
      });
    } else if (type === 'agency') {
      const agency = await Agency.findById(entityId);
      if (!agency) {
        res.status(404).json({ message: 'Agency not found' });
        return;
      }

      const resolvedAchId = resolveId(achievementId);
      const achievement = (agency.achievements || []).find((a: any) =>
        resolvedAchId ? String(a._id) === resolvedAchId : a.id === achievementId
      ) as any;
      if (!achievement) {
        res.status(404).json({ message: 'Achievement not found' });
        return;
      }

      achievement.isVerified = true;
      achievement.verifiedAt = new Date();
      achievement.verifiedBy = currentUser._id;
      achievement.updatedAt = new Date();

      await agency.save();

      res.json({
        message: 'Achievement verified successfully',
        achievement,
      });
    } else {
      res.status(400).json({ message: 'Invalid type. Must be "user" or "agency"' });
    }
  } catch (error: any) {
    apiLogger.error('Error verifying achievement:', error);
    res.status(500).json({ message: 'Error verifying achievement' });
  }
};
