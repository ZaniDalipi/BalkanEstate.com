import express, { Request, Response } from 'express';
import Product from '../models/Product';
import { protect } from '../middleware/auth';

const router = express.Router();


router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { store, active, role } = req.query;

    const query: any = {};

    // Filter by active status (default to true for public API)
    query.isActive = active === 'false' ? false : true;
    query.isVisible = true;

    // Filter by target role if specified
    if (role && typeof role === 'string') {
      query.$or = [
        { targetRole: role },
        { targetRole: 'all' },
      ];
    }

    const products = await Product.find(query).sort({ displayOrder: 1, price: 1 });

    // Filter by store if specified
    let filteredProducts = products;
    if (store === 'google') {
      filteredProducts = products.filter((p) => p.googlePlayProductId);
    } else if (store === 'apple') {
      filteredProducts = products.filter((p) => p.appStoreProductId);
    } else if (store === 'stripe' || store === 'web') {
      filteredProducts = products.filter((p) => p.stripeProductId || p.type === 'subscription');
    }

    res.status(200).json({
      success: true,
      count: filteredProducts.length,
      products: filteredProducts.map((product) => ({
        id: product._id,
        productId: product.productId,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        billingPeriod: product.billingPeriod,
        trialPeriodDays: product.trialPeriodDays,
        features: product.features,
        targetRole: product.targetRole,
        displayOrder: product.displayOrder,
        badge: product.badge,
        badgeColor: product.badgeColor,
        highlighted: product.highlighted,
        cardStyle: product.cardStyle,
        store: {
          google: product.googlePlayProductId,
          apple: product.appStoreProductId,
          stripe: product.stripeProductId,
        },
      })),
    });
  } catch (error: any) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Error getting products', error: error.message });
  }
});

/**
 * @desc    Get a single product by ID or productId
 * @route   GET /api/products/:id
 * @access  Public
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      $or: [{ _id: id }, { productId: id }],
      isActive: true,
      isVisible: true,
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({
      success: true,
      product: {
        id: product._id,
        productId: product.productId,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        billingPeriod: product.billingPeriod,
        trialPeriodDays: product.trialPeriodDays,
        gracePeriodDays: product.gracePeriodDays,
        features: product.features,
        targetRole: product.targetRole,
        displayOrder: product.displayOrder,
        badge: product.badge,
        badgeColor: product.badgeColor,
        highlighted: product.highlighted,
        cardStyle: product.cardStyle,
        store: {
          google: product.googlePlayProductId,
          apple: product.appStoreProductId,
          stripe: product.stripeProductId,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, message: 'Error getting product', error: error.message });
  }
});

// ============================================================================
// ADMIN ROUTES (Protected)
// ============================================================================

/**
 * @desc    Get all products (including inactive) - Admin only
 * @route   GET /api/products/admin/all
 * @access  Private/Admin
 */
router.get('/admin/all', protect, async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find().sort({ displayOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    console.error('Error fetching all products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
});


router.post('/admin', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error: any) {
    console.error('Error creating product:', error);

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Product with this productId already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message,
    });
  }
});

/**
 * @desc    Update product - Admin only
 * @route   PUT /api/products/admin/:id
 * @access  Private/Admin
 */
router.put('/admin/:id', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
});

/**
 * @desc    Delete product - Admin only
 * @route   DELETE /api/products/admin/:id
 * @access  Private/Admin
 */
router.delete('/admin/:id', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
});

/**
 * @desc    Toggle product visibility - Admin only
 * @route   PATCH /api/products/admin/:id/visibility
 * @access  Private/Admin
 */
router.patch('/admin/:id/visibility', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    product.isVisible = !product.isVisible;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.isVisible ? 'shown' : 'hidden'}`,
      product,
    });
  } catch (error: any) {
    console.error('Error toggling product visibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle product visibility',
      error: error.message,
    });
  }
});

/**
 * @desc    Toggle product active status - Admin only
 * @route   PATCH /api/products/admin/:id/status
 * @access  Private/Admin
 */
router.patch('/admin/:id/status', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'}`,
      product,
    });
  } catch (error: any) {
    console.error('Error toggling product status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle product status',
      error: error.message,
    });
  }
});

export default router;
