import { Request, Response } from 'express';

/**
 * Unit-scoped inquiries for apartments that have no published listing
 * (implemented by the units/inventory slice).
 *
 * POST /api/developments/:slug/units/:unitId/inquiries — public, rate-limited,
 * honoured only when the development allows unit inquiries.
 */
export const sendUnitInquiry = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: 'Not implemented yet' });
};
