import express, { Request, Response } from 'express';
import Article from '../models/Article';

const router = express.Router();

// GET /api/articles - Public: list published articles
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      country,
      category,
      tag,
      featured,
      limit = '12',
      page = '1',
      search,
    } = req.query;

    const filter: Record<string, any> = { status: 'published' };
    if (country && country !== 'All') filter.country = country;
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (featured === 'true') filter.isFeatured = true;

    // Text search on title and excerpt
    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate('author', 'name')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Article.countDocuments(filter),
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
    res.status(500).json({ message: 'Failed to fetch articles' });
  }
});

// GET /api/articles/categories - Public: list available categories with article counts
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ categories: categories.map(c => ({ name: c._id, count: c.count })) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// GET /api/articles/countries - Public: list available countries with article counts
router.get('/countries', async (_req: Request, res: Response) => {
  try {
    const countries = await Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ countries: countries.map(c => ({ name: c._id, count: c.count })).filter(c => c.name) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

// GET /api/articles/:slug - Public: get single article by slug
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    // Increment viewCount
    const article = await Article.findOneAndUpdate(
      { slug, status: 'published' },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('author', 'name');

    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    res.json({ article });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch article' });
  }
});

export default router;
