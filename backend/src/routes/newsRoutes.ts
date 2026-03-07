import express, { Request, Response } from 'express';
import News from '../models/News';

const router = express.Router();

// GET /api/news - Public: list news articles
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      country,
      category,
      limit = '12',
      page = '1',
    } = req.query;

    const filter: Record<string, any> = {};
    if (country && country !== 'All') filter.country = country;
    if (category) filter.category = category;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      News.find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      News.countDocuments(filter),
    ]);

    res.json({
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// GET /api/news/countries - Public: list available countries with article counts
router.get('/countries', async (_req: Request, res: Response) => {
  try {
    const countries = await News.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ countries: countries.map(c => ({ name: c._id, count: c.count })) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

export default router;
