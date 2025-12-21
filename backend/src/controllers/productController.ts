import { Request, Response } from 'express';
import Product from '../models/Product';

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * Get all active and visible products (optionally filtered by target role)
 * GET /api/products?role=buyer|seller|agent
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;

    // Build filter
    const filter: any = {
      isActive: true,
      isVisible: true,
    };

    // Filter by target role if specified
    if (role && typeof role === 'string') {
      filter.$or = [
        { targetRole: role },
        { targetRole: 'all' },
      ];
    }

    // Fetch products sorted by displayOrder
    const products = await Product.find(filter).sort({ displayOrder: 1, price: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

/**
 * Get a single product by productId
 * GET /api/products/:productId
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({ productId, isActive: true, isVisible: true });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
};

// ============================================================================
// ADMIN ENDPOINTS (Protected)
// ============================================================================

/**
 * Get all products (including inactive/hidden) - Admin only
 * GET /api/admin/products
 */
export const getAllProductsAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find().sort({ displayOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

/**
 * Create a new product - Admin only
 * POST /api/admin/products
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Update a product - Admin only
 * PUT /api/admin/products/:id
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Delete a product - Admin only
 * DELETE /api/admin/products/:id
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Toggle product visibility - Admin only
 * PATCH /api/admin/products/:id/visibility
 */
export const toggleProductVisibility = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Toggle product active status - Admin only
 * PATCH /api/admin/products/:id/status
 */
export const toggleProductStatus = async (req: Request, res: Response): Promise<void> => {
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
};
