import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Agent from '../models/Agent';
import { uploadImage, deleteImages } from '../services/imageStorageService';
import { apiLogger } from '../utils/logger';
import { validateLicenseNumber, getLicenseFormatHint, SUPPORTED_LICENSE_COUNTRIES } from '../utils/licenseValidation';

// @desc    Upload agent license document (optional)
// @route   POST /api/license/upload
// @access  Private
export const uploadLicense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const { licenseNumber, country, expiryDate } = req.body;

    // Get the uploaded file
    if (!req.file) {
      res.status(400).json({
        message: 'License document image is required',
        code: 'MISSING_DOCUMENT'
      });
      return;
    }

    // Upload license document to Cloudinary
    // Path: balkan-estate/users/{userId}/documents/license/
    const uploadResult = await uploadImage(req.file.buffer, {
      userId: String(currentUser._id),
      type: 'license',
      maxWidth: 2000,
      maxHeight: 2000,
    });

    const user = await User.findById(currentUser._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Delete old license document if exists
    if (user.agentLicense?.documentPublicId) {
      await deleteImages([user.agentLicense.documentPublicId]);
    }

    // Update user with license information (optional - no verification needed)
    user.agentLicense = {
      number: licenseNumber || '',
      country: country || '',
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      documentUrl: uploadResult.url,
      documentPublicId: uploadResult.publicId,
      status: 'pending', // Status doesn't matter anymore, kept for compatibility
      submittedAt: new Date(),
      isVerified: false, // Kept for compatibility, but not used
    };

    await user.save();

    // License uploaded successfully

    res.status(200).json({
      message: 'License uploaded successfully',
      license: {
        number: user.agentLicense.number,
        country: user.agentLicense.country,
        documentUrl: user.agentLicense.documentUrl,
        uploadedAt: user.agentLicense.submittedAt,
      },
    });
  } catch (error: any) {
    apiLogger.error('Upload license error:', error);
    res.status(500).json({
      message: 'Error uploading license',
    });
  }
};

// @desc    Get user's license information
// @route   GET /api/license
// @access  Private
export const getLicense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(currentUser._id)
      .select('agentLicense email name');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.agentLicense || !user.agentLicense.documentUrl) {
      res.status(200).json({
        hasLicense: false,
        message: 'No license uploaded',
      });
      return;
    }

    res.status(200).json({
      hasLicense: true,
      license: {
        number: user.agentLicense.number,
        country: user.agentLicense.country,
        documentUrl: user.agentLicense.documentUrl,
        expiryDate: user.agentLicense.expiryDate,
        uploadedAt: user.agentLicense.submittedAt,
      },
    });
  } catch (error: any) {
    apiLogger.error('Get license error:', error);
    res.status(500).json({
      message: 'Error fetching license',
    });
  }
};

// @desc    Delete user's license document
// @route   DELETE /api/license
// @access  Private
export const deleteLicense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(currentUser._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.agentLicense?.documentPublicId) {
      res.status(404).json({
        message: 'No license document to delete',
      });
      return;
    }

    // Delete from Cloudinary
    await deleteImages([user.agentLicense.documentPublicId]);

    // Clear license data
    user.agentLicense = undefined;
    await user.save();

    // License deleted successfully

    res.status(200).json({
      message: 'License deleted successfully',
    });
  } catch (error: any) {
    apiLogger.error('Delete license error:', error);
    res.status(500).json({
      message: 'Error deleting license',
    });
  }
};

// @desc    Submit license number for verification (for agents who registered without one)
// @route   POST /api/license/submit
// @access  Private (agents only)
export const submitLicense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const { licenseNumber, country } = req.body;

    if (!licenseNumber || !country) {
      res.status(400).json({
        message: 'License number and country are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const user = await User.findById(currentUser._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role !== 'agent') {
      res.status(403).json({
        message: 'Only agents can submit a license for verification',
        code: 'NOT_AGENT',
      });
      return;
    }

    // Validate the license format for the given country
    const validation = validateLicenseNumber(licenseNumber, country);
    if (!validation.valid) {
      res.status(400).json({
        message: 'Invalid license number format for the selected country',
        code: 'INVALID_LICENSE_FORMAT',
        formatHint: validation.formatHint,
      });
      return;
    }

    // Check if license is already in use by another agent
    const existingAgent = await Agent.findOne({
      licenseNumber,
      userId: { $ne: user._id },
    });

    if (existingAgent) {
      res.status(400).json({
        message: 'This license number is already registered to another agent',
      });
      return;
    }

    // Update User model
    user.licenseNumber = licenseNumber;
    user.licenseVerified = false;
    user.licenseVerificationDate = undefined;
    // Sync agentLicense sub-document (clear any prior rejection)
    if (user.agentLicense) {
      user.agentLicense.number = licenseNumber;
      user.agentLicense.country = country;
      user.agentLicense.status = 'pending';
      user.agentLicense.isVerified = false;
      user.agentLicense.rejectionReason = undefined;
      user.agentLicense.submittedAt = new Date();
    }
    await user.save();

    // Update Agent model
    const agentRecord = await Agent.findOne({ userId: user._id });
    if (agentRecord) {
      agentRecord.licenseNumber = licenseNumber;
      agentRecord.licenseCountry = country;
      agentRecord.licenseVerified = false;
      agentRecord.licenseVerificationDate = undefined;
      agentRecord.licenseStatus = 'pending';
      await agentRecord.save();
    }

    res.status(200).json({
      message: 'License submitted for verification. An admin will review it shortly.',
      licenseStatus: 'pending',
      licenseNumber,
      country,
    });
  } catch (error: any) {
    apiLogger.error('Submit license error:', error);
    res.status(500).json({
      message: 'Error submitting license',
    });
  }
};

// @desc    Get format hint for a country's license number
// @route   GET /api/license/format-hint/:countryCode
// @access  Public
export const getFormatHint = async (
  req: Request,
  res: Response
): Promise<void> => {
  const countryCode = req.params.countryCode as string;
  const hint = getLicenseFormatHint(countryCode);
  res.json({
    countryCode: countryCode.toUpperCase(),
    formatHint: hint,
    supportedCountries: SUPPORTED_LICENSE_COUNTRIES,
  });
};
