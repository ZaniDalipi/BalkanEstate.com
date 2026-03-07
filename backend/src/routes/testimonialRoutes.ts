import express, { Request, Response } from 'express';
import Testimonial from '../models/Testimonial';
import { protect } from '../middleware/auth';

const router = express.Router();

// GET /api/testimonials - Public: list approved testimonials
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = '10', source } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));

    const filter: Record<string, any> = { status: 'approved' };
    if (source) filter.source = source;

    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.json({ testimonials });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
});

// POST /api/testimonials - Authenticated: submit a testimonial for review
router.post('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { quote, rating, profession, country } = req.body;

    if (!quote || !rating) {
      res.status(400).json({ message: 'Quote and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    if (quote.length < 10 || quote.length > 500) {
      res.status(400).json({ message: 'Quote must be between 10 and 500 characters' });
      return;
    }

    // Check if user already has a pending or approved testimonial
    const existing = await Testimonial.findOne({
      userId: user._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      res.status(409).json({ message: 'You already have a testimonial submitted' });
      return;
    }

    const testimonial = await Testimonial.create({
      userId: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
      avatarUrl: user.avatarUrl || undefined,
      profession: profession || undefined,
      country: country || undefined,
      rating,
      quote,
      source: 'platform',
      status: 'pending',
    });

    res.status(201).json({
      message: 'Testimonial submitted for review. It will appear once approved.',
      testimonial: { id: testimonial._id, status: testimonial.status },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit testimonial' });
  }
});

export default router;
