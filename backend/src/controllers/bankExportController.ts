import { Request, Response } from 'express';
import {
  createBankExport,
  getExportHistory,
  getExportByBatchId,
} from '../services/bankExportService';
import { SubscriptionStore } from '../models/Subscription';

/**
 * @desc    Create a new bank export
 * @route   POST /api/bank-exports
 * @access  Admin only
 */
export const createExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const userRole = (req as any).user?.role;

    // Check if user is admin
    if (userRole !== 'admin') {
      res.status(403).json({ message: 'Access denied. Admin only.' });
      return;
    }

    const {
      startDate,
      endDate,
      stores,
      minAmount,
      maxAmount,
      format = 'csv',
    } = req.body;

    // Validate required fields
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Start date and end date are required' });
      return;
    }

    // Create the export
    const result = await createBankExport({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      stores: stores as SubscriptionStore[],
      minAmount,
      maxAmount,
      format,
      processedBy: userId,
    });

    res.status(201).json({
      message: 'Export created successfully',
      export: {
        batchId: result.batchId,
        recordCount: result.recordCount,
        totalAmount: result.totalAmount,
        currency: result.currency,
        fileName: result.fileName,
      },
      // Return file content for immediate download
      fileContent: result.fileContent,
    });
  } catch (error: any) {
    console.error('Error creating bank export:', error);
    res.status(500).json({ message: 'Error creating export', error: error.message });
  }
};

/**
 * @desc    Get export history
 * @route   GET /api/bank-exports
 * @access  Admin only
 */
export const getExports = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    // Check if user is admin
    if (userRole !== 'admin') {
      res.status(403).json({ message: 'Access denied. Admin only.' });
      return;
    }

    const { limit = 50, skip = 0, status } = req.query;

    const exports = await getExportHistory({
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
      status: status as string,
    });

    res.status(200).json({
      exports: exports.map((exp) => ({
        id: exp._id,
        batchId: exp.batchId,
        exportDate: exp.exportDate,
        startDate: exp.startDate,
        endDate: exp.endDate,
        status: exp.status,
        format: exp.format,
        recordCount: exp.recordCount,
        totalAmount: exp.totalAmount,
        currency: exp.currency,
        fileName: exp.fileName,
      })),
    });
  } catch (error: any) {
    console.error('Error getting exports:', error);
    res.status(500).json({ message: 'Error getting exports', error: error.message });
  }
};

/**
 * @desc    Get a specific export by batch ID
 * @route   GET /api/bank-exports/:batchId
 * @access  Admin only
 */
export const getExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    // Check if user is admin
    if (userRole !== 'admin') {
      res.status(403).json({ message: 'Access denied. Admin only.' });
      return;
    }

    const { batchId } = req.params;

    const bankExport = await getExportByBatchId(batchId);

    res.status(200).json({
      export: {
        id: bankExport._id,
        batchId: bankExport.batchId,
        exportDate: bankExport.exportDate,
        startDate: bankExport.startDate,
        endDate: bankExport.endDate,
        status: bankExport.status,
        format: bankExport.format,
        stores: bankExport.stores,
        recordCount: bankExport.recordCount,
        totalAmount: bankExport.totalAmount,
        currency: bankExport.currency,
        fileName: bankExport.fileName,
        fileSize: bankExport.fileSize,
        processedAt: bankExport.processedAt,
        records: bankExport.records,
      },
    });
  } catch (error: any) {
    console.error('Error getting export:', error);
    res.status(404).json({ message: 'Export not found', error: error.message });
  }
};

/**
 * @desc    Download an export file
 * @route   GET /api/bank-exports/:batchId/download
 * @access  Admin only
 */
export const downloadExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    // Check if user is admin
    if (userRole !== 'admin') {
      res.status(403).json({ message: 'Access denied. Admin only.' });
      return;
    }

    const { batchId } = req.params;

    const bankExport = await getExportByBatchId(batchId);

    // In production, redirect to S3 signed URL
    // res.redirect(bankExport.downloadUrl);

    // For now, regenerate the file content
    // This would normally be fetched from cloud storage
    res.status(200).json({
      message: 'Download URL would be provided here',
      fileName: bankExport.fileName,
      batchId: bankExport.batchId,
    });
  } catch (error: any) {
    console.error('Error downloading export:', error);
    res.status(404).json({ message: 'Export not found', error: error.message });
  }
};
