import { Request, Response } from 'express';
import DiscountCode from '../models/DiscountCode';
import { IUser } from '../models/User';

// @desc    Create a new discount code (Admin only)
// @route   POST /api/discount-codes
// @access  Private/Admin
export const createDiscountCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Check if user is admin (you might want to add an isAdmin field to User model)
    // For now, we'll allow agents and sellers to create codes

    const {
      code,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      applicablePlans,
      description,
      source,
    } = req.body;

    // Validation
    if (!code || !discountValue || !validUntil) {
      res.status(400).json({ message: 'Code, discount value, and expiration date are required' });
      return;
    }

    // Check if code already exists
    const existingCode = await DiscountCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      res.status(400).json({ message: 'Discount code already exists' });
      return;
    }

    // Create discount code
    const discountCode = await DiscountCode.create({
      code: code.toUpperCase(),
      discountType: discountType || 'percentage',
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom: validFrom || new Date(),
      validUntil: new Date(validUntil),
      usageLimit: usageLimit || 1,
      applicablePlans,
      description,
      source: source || 'admin',
      createdBy: currentUser._id,
      isActive: true,
    });

    res.status(201).json({
      message: 'Discount code created successfully',
      discountCode: {
        id: String(discountCode._id),
        code: discountCode.code,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        minPurchaseAmount: discountCode.minPurchaseAmount,
        maxDiscountAmount: discountCode.maxDiscountAmount,
        validFrom: discountCode.validFrom,
        validUntil: discountCode.validUntil,
        usageLimit: discountCode.usageLimit,
        usedCount: discountCode.usedCount,
        applicablePlans: discountCode.applicablePlans,
        description: discountCode.description,
        source: discountCode.source,
        isActive: discountCode.isActive,
      },
    });
  } catch (error: any) {
    console.error('Create discount code error:', error);
    res.status(500).json({ message: 'Error creating discount code', error: error.message });
  }
};

// @desc    Generate random discount codes in bulk (Admin only)
// @route   POST /api/discount-codes/generate
// @access  Private/Admin
export const generateDiscountCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const {
      count,
      discountType,
      discountValue,
      validUntil,
      usageLimit,
      applicablePlans,
      source,
      prefix,
    } = req.body;

    if (!count || count < 1 || count > 100) {
      res.status(400).json({ message: 'Count must be between 1 and 100' });
      return;
    }

    if (!discountValue || !validUntil) {
      res.status(400).json({ message: 'Discount value and expiration date are required' });
      return;
    }

    const generatedCodes: string[] = [];
    const codePrefix = prefix || 'DISC';

    for (let i = 0; i < count; i++) {
      // Generate random code: PREFIX-RANDOM8
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const code = `${codePrefix}-${randomPart}`;

      try {
        const discountCode = await DiscountCode.create({
          code,
          discountType: discountType || 'percentage',
          discountValue,
          validFrom: new Date(),
          validUntil: new Date(validUntil),
          usageLimit: usageLimit || 1,
          applicablePlans,
          source: source || 'admin',
          description: `Auto-generated bulk discount code ${i + 1}/${count}`,
          createdBy: currentUser._id,
          isActive: true,
        });

        generatedCodes.push(discountCode.code);
      } catch (error) {
        console.error(`Failed to create code ${code}:`, error);
        // Skip duplicates and continue
      }
    }

    res.status(201).json({
      message: `Generated ${generatedCodes.length} discount codes`,
      codes: generatedCodes,
    });
  } catch (error: any) {
    console.error('Generate discount codes error:', error);
    res.status(500).json({ message: 'Error generating discount codes', error: error.message });
  }
};

// @desc    Validate a discount code
// @route   POST /api/discount-codes/validate
// @access  Public
export const validateDiscountCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, planId, purchaseAmount } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Discount code is required' });
      return;
    }

    // Find the discount code
    const discountCode = await DiscountCode.findOne({ code: code.toUpperCase() });

    if (!discountCode) {
      res.status(404).json({
        valid: false,
        message: 'Invalid discount code',
      });
      return;
    }

    // Get user ID if authenticated
    const userId = req.user ? String((req.user as IUser)._id) : undefined;

    // Check if code is valid
    const validation = discountCode.isValid(userId, planId, purchaseAmount);

    if (!validation.valid) {
      res.status(400).json({
        valid: false,
        message: validation.reason,
      });
      return;
    }

    // Calculate discount
    const discountAmount = purchaseAmount ? discountCode.calculateDiscount(purchaseAmount) : 0;
    const finalPrice = purchaseAmount ? purchaseAmount - discountAmount : 0;

    res.json({
      valid: true,
      message: 'Discount code is valid',
      discount: {
        code: discountCode.code,
        type: discountCode.discountType,
        value: discountCode.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
        originalPrice: purchaseAmount,
        finalPrice: Math.round(finalPrice * 100) / 100,
        description: discountCode.description,
      },
    });
  } catch (error: any) {
    console.error('Validate discount code error:', error);
    res.status(500).json({ message: 'Error validating discount code', error: error.message });
  }
};

// @desc    Redeem (use) a discount code
// @route   POST /api/discount-codes/redeem
// @access  Private
export const redeemDiscountCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const { code, planId, purchaseAmount } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Discount code is required' });
      return;
    }

    // Find the discount code
    const discountCode = await DiscountCode.findOne({ code: code.toUpperCase() });

    if (!discountCode) {
      res.status(404).json({ message: 'Invalid discount code' });
      return;
    }

    // Validate code
    const userId = String(currentUser._id);
    const validation = discountCode.isValid(userId, planId, purchaseAmount);

    if (!validation.valid) {
      res.status(400).json({ message: validation.reason });
      return;
    }

    // Calculate discount
    const discountAmount = purchaseAmount ? discountCode.calculateDiscount(purchaseAmount) : 0;
    const finalPrice = purchaseAmount ? purchaseAmount - discountAmount : 0;

    // Mark code as used
    await discountCode.markAsUsed(userId);

    res.json({
      message: 'Discount code redeemed successfully',
      discount: {
        code: discountCode.code,
        discountAmount: Math.round(discountAmount * 100) / 100,
        originalPrice: purchaseAmount,
        finalPrice: Math.round(finalPrice * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('Redeem discount code error:', error);
    res.status(500).json({ message: 'Error redeeming discount code', error: error.message });
  }
};

// @desc    Get all discount codes (Admin only)
// @route   GET /api/discount-codes
// @access  Private/Admin
export const getAllDiscountCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { source, isActive, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (source) query.source = source;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const discountCodes = await DiscountCode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name email')
      .lean();

    const total = await DiscountCode.countDocuments(query);

    res.json({
      discountCodes: discountCodes.map(code => ({
        id: String(code._id),
        code: code.code,
        discountType: code.discountType,
        discountValue: code.discountValue,
        minPurchaseAmount: code.minPurchaseAmount,
        maxDiscountAmount: code.maxDiscountAmount,
        validFrom: code.validFrom,
        validUntil: code.validUntil,
        usageLimit: code.usageLimit,
        usedCount: code.usedCount,
        remainingUses: code.usageLimit - code.usedCount,
        applicablePlans: code.applicablePlans,
        source: code.source,
        description: code.description,
        isActive: code.isActive,
        createdBy: code.createdBy,
        createdAt: code.createdAt,
      })),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get discount codes error:', error);
    res.status(500).json({ message: 'Error fetching discount codes', error: error.message });
  }
};

// @desc    Deactivate a discount code (Admin only)
// @route   PATCH /api/discount-codes/:id/deactivate
// @access  Private/Admin
export const deactivateDiscountCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const discountCode = await DiscountCode.findById(req.params.id);

    if (!discountCode) {
      res.status(404).json({ message: 'Discount code not found' });
      return;
    }

    discountCode.isActive = false;
    await discountCode.save();

    res.json({
      message: 'Discount code deactivated successfully',
      discountCode: {
        id: String(discountCode._id),
        code: discountCode.code,
        isActive: discountCode.isActive,
      },
    });
  } catch (error: any) {
    console.error('Deactivate discount code error:', error);
    res.status(500).json({ message: 'Error deactivating discount code', error: error.message });
  }
};

// @desc    Delete a discount code (Admin only)
// @route   DELETE /api/discount-codes/:id
// @access  Private/Admin
export const deleteDiscountCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const discountCode = await DiscountCode.findById(req.params.id);

    if (!discountCode) {
      res.status(404).json({ message: 'Discount code not found' });
      return;
    }

    // Only allow deletion if code has not been used
    if (discountCode.usedCount > 0) {
      res.status(400).json({
        message: 'Cannot delete a discount code that has been used. Deactivate it instead.',
      });
      return;
    }

    await discountCode.deleteOne();

    res.json({ message: 'Discount code deleted successfully' });
  } catch (error: any) {
    console.error('Delete discount code error:', error);
    res.status(500).json({ message: 'Error deleting discount code', error: error.message });
  }
};
