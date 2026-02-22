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
      applicableDurations,
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

    // Validate applicableDurations if provided
    const validDurations = [7, 15, 30, 60, 90];
    if (applicableDurations && Array.isArray(applicableDurations)) {
      const invalidDurations = applicableDurations.filter((d: number) => !validDurations.includes(d));
      if (invalidDurations.length > 0) {
        res.status(400).json({
          message: `Invalid durations: ${invalidDurations.join(', ')}. Must be one of: ${validDurations.join(', ')}`,
          code: 'INVALID_DURATIONS',
        });
        return;
      }
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
      applicableDurations: applicableDurations?.length ? applicableDurations : undefined,
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
        applicableDurations: coupon.applicableDurations,
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
    const { couponCode, price, tier, code, amount, promotionTier, duration } = req.body;
    const userId = (req as any).user?.id || (req as any).user?._id;

    const actualCode = couponCode || code;
    const actualPrice = price !== undefined ? price : amount;
    const actualTier = tier || promotionTier;
    const actualDuration = duration ? Number(duration) : undefined;

    if (!userId) {
      res.status(401).json({ message: 'You must be logged in to use a coupon' });
      return;
    }

    if (!actualCode || actualPrice === undefined) {
      res.status(400).json({ message: 'Please enter a coupon code' });
      return;
    }

    const coupon = await PromotionCoupon.findOne({
      code: actualCode.toUpperCase(),
    });

    if (!coupon) {
      res.status(404).json({ message: 'This coupon code does not exist. Please check the code and try again.' });
      return;
    }

    if (coupon.status === 'disabled') {
      res.status(400).json({ message: 'This coupon has been deactivated and is no longer available.' });
      return;
    }

    if (coupon.status === 'expired' || !coupon.isValid()) {
      const expiredDate = coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString() : '';
      res.status(400).json({ message: `This coupon expired on ${expiredDate}. It is no longer valid.` });
      return;
    }

    // Check total usage limit
    if (coupon.maxTotalUses && coupon.currentTotalUses >= coupon.maxTotalUses) {
      res.status(400).json({ message: 'This coupon has reached its maximum number of uses and is no longer available.' });
      return;
    }

    const canUse = await coupon.canBeUsedBy(userId as any);
    if (!canUse) {
      res.status(400).json({ message: 'You have already used this coupon the maximum number of times allowed.' });
      return;
    }

    if (actualTier && coupon.applicableTiers && coupon.applicableTiers.length > 0) {
      if (!coupon.applicableTiers.includes(actualTier)) {
        const allowedTiers = coupon.applicableTiers.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
        res.status(400).json({ message: `This coupon is only valid for ${allowedTiers} promotion tiers.` });
        return;
      }
    }

    // Check applicable durations
    if (actualDuration && coupon.applicableDurations && coupon.applicableDurations.length > 0) {
      if (!coupon.applicableDurations.includes(actualDuration as 7 | 15 | 30 | 60 | 90)) {
        const allowedDurations = coupon.applicableDurations.map((d: number) => `${d} days`).join(', ');
        res.status(400).json({ message: `This coupon is only valid for ${allowedDurations} promotion durations.` });
        return;
      }
    }

    if (coupon.minimumPurchaseAmount && actualPrice < coupon.minimumPurchaseAmount) {
      res.status(400).json({
        message: `This coupon requires a minimum purchase of €${coupon.minimumPurchaseAmount.toFixed(2)}.`
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
    res.status(500).json({ message: 'Something went wrong while validating the coupon. Please try again.' });
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
        applicableDurations: coupon.applicableDurations,
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
        applicableDurations: coupon.applicableDurations,
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
