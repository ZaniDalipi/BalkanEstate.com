import { Request, Response } from 'express';
import PromotionCoupon from '../models/PromotionCoupon';
import User, { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';

/**
 * @desc    Create a new promotion coupon (Admin only)
 * @route   POST /api/coupons
 * @access  Private (Admin)
 */
export const createCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      maxTotalUses,
      maxUsesPerUser,
      applicableTiers,
      minimumPurchaseAmount,
      notes,
      isPublic,
    } = req.body;

    // Validation
    if (!code || !discountType || !discountValue || !validUntil) {
      res.status(400).json({
        message: 'Code, discount type, discount value, and valid until are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    // Check if code already exists
    const existingCoupon = await PromotionCoupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      res.status(400).json({
        message: 'Coupon code already exists',
        code: 'DUPLICATE_CODE',
      });
      return;
    }

    // Create coupon
    const coupon = await PromotionCoupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      validFrom: validFrom || new Date(),
      validUntil: new Date(validUntil),
      maxTotalUses,
      maxUsesPerUser: maxUsesPerUser || 1,
      applicableTiers,
      minimumPurchaseAmount,
      notes,
      isPublic: isPublic || false,
      createdBy: user._id,
      currentTotalUses: 0,
      usageHistory: [],
    });

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        maxTotalUses: coupon.maxTotalUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        applicableTiers: coupon.applicableTiers,
        minimumPurchaseAmount: coupon.minimumPurchaseAmount,
        isPublic: coupon.isPublic,
      },
    });
  } catch (error: any) {
    apiLogger.error('Create coupon error:', error);
    res.status(500).json({ message: 'Error creating coupon' });
  }
};

/**
 * @desc    Validate a coupon code
 * @route   POST /api/coupons/validate
 * @access  Private
 */
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support both new and old parameter names for backward compatibility
    const { couponCode, price, tier, code, amount, promotionTier } = req.body;
    const userId = (req as any).user?.id || (req as any).user?._id;

    const actualCode = couponCode || code;
    const actualPrice = price !== undefined ? price : amount;
    const actualTier = tier || promotionTier;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!actualCode || actualPrice === undefined) {
      res.status(400).json({ error: 'Coupon code and price are required' });
      return;
    }

    const coupon = await PromotionCoupon.findOne({
      code: actualCode.toUpperCase(),
      status: 'active',
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found or expired' });
      return;
    }

    if (!coupon.isValid()) {
      res.status(400).json({ error: 'Coupon is not valid or expired' });
      return;
    }

    const canUse = await coupon.canBeUsedBy(userId as any);
    if (!canUse) {
      res.status(400).json({ error: 'You have already used this coupon' });
      return;
    }

    if (actualTier && coupon.applicableTiers && coupon.applicableTiers.length > 0) {
      if (!coupon.applicableTiers.includes(actualTier)) {
        res.status(400).json({ error: 'Coupon not applicable to this subscription tier' });
        return;
      }
    }

    if (coupon.minimumPurchaseAmount && actualPrice < coupon.minimumPurchaseAmount) {
      res.status(400).json({
        error: 'Minimum purchase amount of €' + coupon.minimumPurchaseAmount + ' required'
      });
      return;
    }

    const discount = coupon.calculateDiscount(actualPrice);
    const finalPrice = Math.max(0, actualPrice - discount);

    res.json({
      valid: true,
      couponCode: coupon.code,
      discount,
      finalPrice,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (error) {
    apiLogger.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
};

/**
 * @desc    Get all coupons (Admin only)
 * @route   GET /api/coupons
 * @access  Private (Admin)
 */
export const getAllCoupons = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const { status } = req.query;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const coupons = await PromotionCoupon.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      coupons: coupons.map(coupon => ({
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        status: coupon.status,
        maxTotalUses: coupon.maxTotalUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        currentTotalUses: coupon.currentTotalUses,
        applicableTiers: coupon.applicableTiers,
        minimumPurchaseAmount: coupon.minimumPurchaseAmount,
        isPublic: coupon.isPublic,
        createdBy: coupon.createdBy,
        notes: coupon.notes,
        createdAt: coupon.createdAt,
        usageCount: coupon.usageHistory?.length || 0,
      })),
      total: coupons.length,
    });
  } catch (error: any) {
    apiLogger.error('Get coupons error:', error);
    res.status(500).json({ message: 'Error fetching coupons' });
  }
};

/**
 * @desc    Get public coupons
 * @route   GET /api/coupons/public
 * @access  Public
 */
export const getPublicCoupons = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const coupons = await (PromotionCoupon as any).getPublicCoupons();

    res.json({
      coupons: coupons.map((coupon: any) => ({
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validUntil: coupon.validUntil,
        applicableTiers: coupon.applicableTiers,
        minimumPurchaseAmount: coupon.minimumPurchaseAmount,
      })),
    });
  } catch (error: any) {
    apiLogger.error('Get public coupons error:', error);
    res.status(500).json({ message: 'Error fetching public coupons' });
  }
};

/**
 * @desc    Get coupon details and usage (Admin only)
 * @route   GET /api/coupons/:id
 * @access  Private (Admin)
 */
export const getCouponDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const coupon = await PromotionCoupon.findById(id)
      .populate('createdBy', 'name email')
      .populate('usageHistory.userId', 'name email')
      .populate('usageHistory.promotionId', 'type tier status startDate endDate');

    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
      return;
    }

    res.json({
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        status: coupon.status,
        maxTotalUses: coupon.maxTotalUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        currentTotalUses: coupon.currentTotalUses,
        applicableTiers: coupon.applicableTiers,
        minimumPurchaseAmount: coupon.minimumPurchaseAmount,
        isPublic: coupon.isPublic,
        createdBy: coupon.createdBy,
        notes: coupon.notes,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
        usageHistory: coupon.usageHistory,
      },
    });
  } catch (error: any) {
    apiLogger.error('Get coupon details error:', error);
    res.status(500).json({ message: 'Error fetching coupon details' });
  }
};

/**
 * @desc    Update coupon (Admin only)
 * @route   PUT /api/coupons/:id
 * @access  Private (Admin)
 */
export const updateCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const coupon = await PromotionCoupon.findById(id);

    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
      return;
    }

    const {
      description,
      validUntil,
      status,
      maxTotalUses,
      maxUsesPerUser,
      applicableTiers,
      minimumPurchaseAmount,
      notes,
      isPublic,
    } = req.body;

    // Update fields
    if (description !== undefined) coupon.description = description;
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (status !== undefined) coupon.status = status;
    if (maxTotalUses !== undefined) coupon.maxTotalUses = maxTotalUses;
    if (maxUsesPerUser !== undefined) coupon.maxUsesPerUser = maxUsesPerUser;
    if (applicableTiers !== undefined) coupon.applicableTiers = applicableTiers;
    if (minimumPurchaseAmount !== undefined) coupon.minimumPurchaseAmount = minimumPurchaseAmount;
    if (notes !== undefined) coupon.notes = notes;
    if (isPublic !== undefined) coupon.isPublic = isPublic;

    await coupon.save();

    res.json({
      message: 'Coupon updated successfully',
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        status: coupon.status,
        maxTotalUses: coupon.maxTotalUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        currentTotalUses: coupon.currentTotalUses,
        applicableTiers: coupon.applicableTiers,
        minimumPurchaseAmount: coupon.minimumPurchaseAmount,
        isPublic: coupon.isPublic,
      },
    });
  } catch (error: any) {
    apiLogger.error('Update coupon error:', error);
    res.status(500).json({ message: 'Error updating coupon' });
  }
};

/**
 * @desc    Delete/disable coupon (Admin only)
 * @route   DELETE /api/coupons/:id
 * @access  Private (Admin)
 */
export const deleteCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const coupon = await PromotionCoupon.findById(id);

    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
      return;
    }

    // Don't delete, just disable
    coupon.status = 'disabled';
    await coupon.save();

    res.json({
      message: 'Coupon disabled successfully',
      coupon: {
        id: coupon._id,
        code: coupon.code,
        status: coupon.status,
      },
    });
  } catch (error: any) {
    apiLogger.error('Delete coupon error:', error);
    res.status(500).json({ message: 'Error deleting coupon' });
  }
};
