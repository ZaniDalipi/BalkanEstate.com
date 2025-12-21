import { Request, Response } from 'express';
import SalesHistory from '../models/SalesHistory';
import { IUser } from '../models/User';

/**
 * Get sales history for the current user (agent/seller)
 * @route GET /api/sales-history/my-sales
 * @access Private
 */
export const getMySalesHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const { page = 1, limit = 10, sortBy = 'soldAt', order = 'desc' } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort: any = {};
    sort[String(sortBy)] = order === 'asc' ? 1 : -1;

    // Fetch sales history
    const salesHistory = await SalesHistory.find({ sellerId: userId })
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await SalesHistory.countDocuments({ sellerId: userId });

    // Calculate summary statistics
    const allSales = await SalesHistory.find({ sellerId: userId }).lean();
    const summary = {
      totalSales: allSales.length,
      totalRevenue: allSales.reduce((sum, sale) => sum + sale.salePrice, 0),
      totalCommission: allSales.reduce((sum, sale) => sum + (sale.commission || 0), 0),
      averageSalePrice: allSales.length > 0 ? allSales.reduce((sum, sale) => sum + sale.salePrice, 0) / allSales.length : 0,
      averageDaysOnMarket: allSales.length > 0 ? allSales.reduce((sum, sale) => sum + sale.daysOnMarket, 0) / allSales.length : 0,
    };

    res.json({
      sales: salesHistory,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get sales history error:', error);
    res.status(500).json({ message: 'Error fetching sales history', error: error.message });
  }
};

/**
 * Get sales history for a specific agent (public)
 * @route GET /api/sales-history/agent/:agentId
 * @access Public
 */
export const getAgentSalesHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch sales history
    const salesHistory = await SalesHistory.find({ sellerId: agentId })
      .sort({ soldAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-sellerEmail') // Don't expose email publicly
      .lean();

    // Get total count
    const total = await SalesHistory.countDocuments({ sellerId: agentId });

    res.json({
      sales: salesHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get agent sales history error:', error);
    res.status(500).json({ message: 'Error fetching agent sales history', error: error.message });
  }
};

/**
 * Get a specific sale by ID
 * @route GET /api/sales-history/:id
 * @access Private (owner only)
 */
export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const sale = await SalesHistory.findById(id).populate('propertyId');

    if (!sale) {
      res.status(404).json({ message: 'Sale record not found' });
      return;
    }

    // Check ownership
    const userId = String((req.user as IUser)._id);
    if (String(sale.sellerId) !== userId) {
      res.status(403).json({ message: 'Not authorized to view this sale record' });
      return;
    }

    res.json({ sale });
  } catch (error: any) {
    console.error('Get sale by ID error:', error);
    res.status(500).json({ message: 'Error fetching sale record', error: error.message });
  }
};

/**
 * Update sale record (e.g., add commission, notes)
 * @route PATCH /api/sales-history/:id
 * @access Private (owner only)
 */
export const updateSaleRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { commission, commissionRate, notes } = req.body;

    const sale = await SalesHistory.findById(id);

    if (!sale) {
      res.status(404).json({ message: 'Sale record not found' });
      return;
    }

    // Check ownership
    const userId = String((req.user as IUser)._id);
    if (String(sale.sellerId) !== userId) {
      res.status(403).json({ message: 'Not authorized to update this sale record' });
      return;
    }

    // Update allowed fields
    if (commission !== undefined) sale.commission = commission;
    if (commissionRate !== undefined) sale.commissionRate = commissionRate;
    if (notes !== undefined) sale.notes = notes;

    await sale.save();

    res.json({ sale });
  } catch (error: any) {
    console.error('Update sale record error:', error);
    res.status(500).json({ message: 'Error updating sale record', error: error.message });
  }
};
