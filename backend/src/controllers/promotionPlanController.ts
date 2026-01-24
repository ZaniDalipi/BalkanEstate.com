import { Request, Response } from 'express';
import PromotionPlan from '../models/PromotionPlan';

// Get all promotion plans (public)
export const getPromotionPlans = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const filter: any = { isActive: true, isVisible: true };
    if (category) {
      filter.category = category;
    }

    const plans = await PromotionPlan.find(filter).sort({ category: 1, displayOrder: 1 });

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching promotion plans:', error);
    res.status(500).json({ error: 'Failed to fetch promotion plans' });
  }
};

// Get all promotion plans for admin (includes inactive)
export const getAdminPromotionPlans = async (req: Request, res: Response) => {
  try {
    const plans = await PromotionPlan.find().sort({ category: 1, displayOrder: 1 });
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching admin promotion plans:', error);
    res.status(500).json({ error: 'Failed to fetch promotion plans' });
  }
};

// Create a new promotion plan (admin only)
export const createPromotionPlan = async (req: Request, res: Response) => {
  try {
    const plan = new PromotionPlan(req.body);
    await plan.save();
    res.status(201).json({ plan });
  } catch (error) {
    console.error('Error creating promotion plan:', error);
    res.status(500).json({ error: 'Failed to create promotion plan' });
  }
};

// Update a promotion plan (admin only)
export const updatePromotionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await PromotionPlan.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!plan) {
      res.status(404).json({ error: 'Promotion plan not found' });
      return;
    }

    res.json({ plan });
  } catch (error) {
    console.error('Error updating promotion plan:', error);
    res.status(500).json({ error: 'Failed to update promotion plan' });
  }
};

// Delete a promotion plan (admin only)
export const deletePromotionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await PromotionPlan.findByIdAndDelete(id);

    if (!plan) {
      res.status(404).json({ error: 'Promotion plan not found' });
      return;
    }

    res.json({ message: 'Promotion plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion plan:', error);
    res.status(500).json({ error: 'Failed to delete promotion plan' });
  }
};

// Toggle plan active status (admin only)
export const togglePromotionPlanStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await PromotionPlan.findById(id);

    if (!plan) {
      res.status(404).json({ error: 'Promotion plan not found' });
      return;
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({ plan });
  } catch (error) {
    console.error('Error toggling promotion plan status:', error);
    res.status(500).json({ error: 'Failed to toggle plan status' });
  }
};

// Seed default promotion plans (admin utility)
export const seedPromotionPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if plans already exist
    const existingCount = await PromotionPlan.countDocuments();
    if (existingCount > 0) {
      res.json({ message: 'Promotion plans already exist', count: existingCount });
      return;
    }

    const defaultPlans = [
      // Listing promotion plans
      {
        category: 'listing',
        tier: 'featured',
        name: 'Featured',
        description: 'Priority in search',
        icon: '⭐',
        pricing: { duration7: 9, duration30: 29, duration90: 69 },
        features: ['Top of search', 'Featured badge', '2x visibility'],
        visibilityMultiplier: '2x',
        displayOrder: 1,
        cardStyle: {
          gradientFrom: 'purple-50',
          gradientTo: 'purple-100/50',
          borderColor: 'purple-200',
          iconBgColor: 'purple-500',
          priceColor: 'purple-600',
        },
      },
      {
        category: 'listing',
        tier: 'highlight',
        name: 'Highlight',
        description: 'Stand out',
        icon: '💎',
        pricing: { duration7: 19, duration30: 49, duration90: 119 },
        features: ['Featured benefits', 'Colored highlight', '3x visibility'],
        visibilityMultiplier: '3x',
        displayOrder: 2,
        badge: 'Popular',
        highlighted: true,
        cardStyle: {
          gradientFrom: 'cyan-50',
          gradientTo: 'cyan-100/50',
          borderColor: 'cyan-300',
          iconBgColor: 'gradient-to-br from-cyan-400 to-blue-500',
          priceColor: 'cyan-600',
        },
      },
      {
        category: 'listing',
        tier: 'premium',
        name: 'Premium',
        description: 'Homepage featured',
        icon: '🏆',
        pricing: { duration7: 39, duration30: 99, duration90: 229 },
        features: ['Highlight benefits', 'Homepage carousel', '5x visibility'],
        visibilityMultiplier: '5x',
        displayOrder: 3,
        cardStyle: {
          gradientFrom: 'amber-50',
          gradientTo: 'yellow-100/50',
          borderColor: 'amber-200',
          iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500',
          priceColor: 'amber-600',
        },
      },
      // Agency feature plans
      {
        category: 'agency',
        tier: 'spotlight',
        name: 'Spotlight',
        description: 'Increased visibility',
        icon: '🔦',
        pricing: { fixedPrice: 49, fixedDuration: '30 days' },
        features: ['Featured in agency directory', 'Priority in search', 'Spotlight badge'],
        displayOrder: 1,
        cardStyle: {
          gradientFrom: 'gray-100',
          gradientTo: 'gray-200',
          borderColor: 'gray-200',
          iconBgColor: 'gradient-to-br from-gray-100 to-gray-200',
          priceColor: 'gray-900',
        },
      },
      {
        category: 'agency',
        tier: 'homepage',
        name: 'Homepage',
        description: 'Featured on homepage',
        icon: '🏠',
        pricing: { fixedPrice: 99, fixedDuration: '30 days' },
        features: ['Spotlight benefits', 'Homepage carousel', '3x more inquiries'],
        displayOrder: 2,
        badge: 'Recommended',
        highlighted: true,
        cardStyle: {
          gradientFrom: 'amber-50',
          gradientTo: 'orange-50',
          borderColor: 'amber-300',
          iconBgColor: 'gradient-to-br from-amber-400 to-orange-500',
          priceColor: 'amber-600',
        },
      },
      {
        category: 'agency',
        tier: 'premium',
        name: 'Premium',
        description: 'Maximum exposure',
        icon: '👑',
        pricing: { fixedPrice: 199, fixedDuration: '30 days' },
        features: ['All Homepage benefits', 'Featured agent spotlight', 'Priority support', '5x more inquiries'],
        displayOrder: 3,
        cardStyle: {
          gradientFrom: 'slate-800',
          gradientTo: 'slate-900',
          borderColor: 'transparent',
          iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500',
          priceColor: 'amber-400',
        },
      },
    ];

    await PromotionPlan.insertMany(defaultPlans);
    res.json({ message: 'Promotion plans seeded successfully', count: defaultPlans.length });
  } catch (error) {
    console.error('Error seeding promotion plans:', error);
    res.status(500).json({ error: 'Failed to seed promotion plans' });
  }
};
