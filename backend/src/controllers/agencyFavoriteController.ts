import { Request, Response } from 'express';
import AgencyFavorite from '../models/AgencyFavorite';
import Agency from '../models/Agency';
import Property from '../models/Property';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';

// @desc    Get user's favourite agencies
// @route   GET /api/agency-favorites
// @access  Private
export const getAgencyFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const favorites = await AgencyFavorite.find({ userId })
      .populate({
        path: 'agencyId',
        select: 'name slug logo city country ownerId agents isFeatured',
      })
      .sort({ createdAt: -1 })
      .lean();

    const validFavorites = favorites.filter((fav: any) => fav.agencyId != null);

    // The stored totalProperties/totalAgents fields are legacy and not kept in
    // sync, so compute live counts from the DB (owner + agents, active/pending),
    // mirroring the agency detail and top-agencies endpoints.
    const sellerIdsFor = (agency: any): unknown[] => [
      ...(agency.ownerId ? [agency.ownerId] : []),
      ...(agency.agents || []),
    ];

    const allSellerIds = validFavorites.flatMap((fav: any) => sellerIdsFor(fav.agencyId));
    const propertyCounts = allSellerIds.length
      ? await Property.aggregate([
          {
            $match: {
              sellerId: { $in: allSellerIds },
              status: { $in: ['active', 'pending'] },
            },
          },
          { $group: { _id: '$sellerId', count: { $sum: 1 } } },
        ])
      : [];
    const countBySeller = new Map(
      propertyCounts.map((pc: { _id: unknown; count: number }) => [String(pc._id), pc.count])
    );

    const favoritesWithCounts = validFavorites.map((fav: any) => {
      const { ownerId, agents, ...agency } = fav.agencyId;
      const uniqueSellerIds = new Set(sellerIdsFor(fav.agencyId).map(String));
      const totalProperties = [...uniqueSellerIds].reduce(
        (sum, id) => sum + (countBySeller.get(id) || 0),
        0
      );
      return {
        ...fav,
        agencyId: {
          ...agency,
          id: String(agency._id),
          totalProperties,
          totalAgents: agents?.length || 0,
        },
      };
    });

    res.json({ favorites: favoritesWithCounts });
  } catch (error: any) {
    apiLogger.error('Get agency favorites error:', error);
    res.status(500).json({ message: 'Error fetching agency favorites' });
  }
};

// @desc    Toggle agency favourite (add or remove)
// @route   POST /api/agency-favorites/toggle
// @access  Private
export const toggleAgencyFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const rawAgencyId = req.body.agencyId;

    if (!rawAgencyId) {
      res.status(400).json({ message: 'Agency ID is required' });
      return;
    }

    // Resolve obfuscated or raw ID
    const agencyId = resolveId(rawAgencyId) || rawAgencyId;

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const existing = await AgencyFavorite.findOne({ userId, agencyId });

    if (existing) {
      await existing.deleteOne();
      res.json({ message: 'Agency removed from favourites', isSaved: false });
    } else {
      await AgencyFavorite.create({ userId, agencyId });
      res.json({ message: 'Agency added to favourites', isSaved: true });
    }
  } catch (error: any) {
    apiLogger.error('Toggle agency favorite error:', error);
    res.status(500).json({ message: 'Error toggling agency favorite' });
  }
};

// @desc    Check if agency is favourited
// @route   GET /api/agency-favorites/check/:agencyId
// @access  Private
export const checkAgencyFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    const userId = String((req.user as IUser)._id);
    const favorite = await AgencyFavorite.findOne({
      userId,
      agencyId,
    });

    res.json({ isSaved: !!favorite });
  } catch (error: any) {
    apiLogger.error('Check agency favorite error:', error);
    res.status(500).json({ message: 'Error checking agency favorite' });
  }
};
