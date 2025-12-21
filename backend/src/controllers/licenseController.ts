import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { uploadImage, deleteImages } from '../services/cloudinaryService';

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

    // Upload license document to Cloudinary (using avatar type for user-related documents)
    const uploadResult = await uploadImage(req.file.buffer, {
      userId: String(currentUser._id),
      type: 'avatar',
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

    console.log(`📝 License uploaded by ${user.email} (${country || 'N/A'} - ${licenseNumber || 'N/A'})`);

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
    console.error('Upload license error:', error);
    res.status(500).json({
      message: 'Error uploading license',
      error: error.message
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
    console.error('Get license error:', error);
    res.status(500).json({
      message: 'Error fetching license',
      error: error.message
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

    console.log(`🗑️  License deleted for ${user.email}`);

    res.status(200).json({
      message: 'License deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete license error:', error);
    res.status(500).json({
      message: 'Error deleting license',
      error: error.message
    });
  }
};
