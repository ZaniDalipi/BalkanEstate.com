import express, { Request, Response } from 'express';
import Article from '../models/Article';

const router = express.Router();

// Allowed enum values — used to whitelist query params and prevent injection
const VALID_CATEGORIES = new Set(['market', 'investment', 'regulation', 'development', 'tourism', 'guide', 'lifestyle']);

// Safely escape a string for use in a MongoDB $regex query
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── GET /api/articles ──────────────────────────────────────────────────────
// Public: paginated list of published articles with optional filters
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { country, category, tag, featured, limit = '12', page = '1', search } = req.query;

    const filter: Record<string, unknown> = { status: 'published' };

    if (country && typeof country === 'string' && country !== 'All') {
      filter.country = country.substring(0, 100);
    }
    if (category && typeof category === 'string' && VALID_CATEGORIES.has(category)) {
      filter.category = category;
    }
    if (tag && typeof tag === 'string') {
      filter.tags = tag.substring(0, 50);
    }
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Full-text search — escape user input before using in $regex
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = escapeRegex(search.trim().substring(0, 100));
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { excerpt: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate('author', 'name avatarUrl avatarOptions gender')
        .sort({ isFeatured: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-content -coverImagePublicId')
        .lean(),
      Article.countDocuments(filter),
    ]);

    res.json({
      articles,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch articles' });
  }
});

// ── GET /api/articles/categories ──────────────────────────────────────────
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ categories: categories.map(c => ({ name: c._id, count: c.count })) });
  } catch {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// ── GET /api/articles/countries ───────────────────────────────────────────
router.get('/countries', async (_req: Request, res: Response): Promise<void> => {
  try {
    const countries = await Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({
      countries: countries
        .filter(c => c._id)
        .map(c => ({ name: c._id, count: c.count })),
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

// ── GET /api/articles/tags ────────────────────────────────────────────────
router.get('/tags', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await Article.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
    res.json({ tags: result.map(r => r._id) });
  } catch {
    res.status(500).json({ message: 'Failed to fetch tags' });
  }
});

// ── GET /api/articles/:slug ───────────────────────────────────────────────
// Returns published article WITHOUT incrementing view count.
// Views are tracked via POST /:slug/view (called once per session by the client).
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '');

    // Basic slug validation — slugs are lowercase alphanumeric + hyphens only
    if (!/^[a-z0-9-]{1,200}$/.test(slug)) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    const article = await Article.findOne({ slug, status: 'published' })
      .populate('author', 'name avatarUrl avatarOptions gender')
      .lean();

    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    res.json({ article });
  } catch {
    res.status(500).json({ message: 'Failed to fetch article' });
  }
});

// ── POST /api/articles/:slug/view ─────────────────────────────────────────
// Increments view count. Called once per session by the client (deduplicated
// via sessionStorage). Fire-and-forget — always returns 204.
router.post('/:slug/view', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '');
    if (/^[a-z0-9-]{1,200}$/.test(slug)) {
      await Article.updateOne({ slug, status: 'published' }, { $inc: { viewCount: 1 } });
    }
  } catch {
    // Silently ignore — view tracking is non-critical
  } finally {
    res.status(204).end();
  }
});

export default router;
