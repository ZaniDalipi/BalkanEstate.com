import { Request, Response } from 'express';
import { sendServiceError } from './developmentController';
import { sendUnitInquiry as sendUnitInquiryService } from '../services/developments/unitInquiryService';

/**
 * Unit-scoped inquiries (useful for apartments that have no published listing).
 *
 * POST /api/developments/:slug/units/:unitId/inquiries — public, rate-limited
 * at the route, honoured only for a published development, a visible unit, and
 * when the development allows unit inquiries. 201 { message }.
 */
export const sendUnitInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    await sendUnitInquiryService({
      slug: req.params.slug,
      unitId: req.params.unitId,
      payload: req.body,
    });
    res.status(201).json({ message: 'Your inquiry has been sent successfully' });
  } catch (error) {
    sendServiceError(res, error, 'send unit inquiry');
  }
};
