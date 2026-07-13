import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import HotelListingCode from '../models/HotelListingCode';
import { IUser } from '../models/User';
import { getObjectIdParam } from '../utils/validateParams';

const ADMIN_ROLES = ['admin', 'super_admin'];

const isAdmin = (req: Request): boolean => {
  const user = req.user as IUser | undefined;
  return !!user && ADMIN_ROLES.includes((user as any).role);
};

/** Generate a readable, hard-to-guess code, e.g. HOTEL-7F3K-9QP2. */
const generateCode = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
  return `HOTEL-${block()}-${block()}`;
};

// @desc    Generate one or more listing codes
// @route   POST /api/hotel-codes/generate
// @access  Admin
export const generateHotelCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }
    const user = req.user as IUser;
    const count = Math.min(100, Math.max(1, parseInt(req.body.count, 10) || 1));
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 200) : undefined;
    let expiresAt: Date | undefined;
    if (req.body.expiresAt) {
      const d = new Date(req.body.expiresAt);
      if (!Number.isNaN(d.getTime())) expiresAt = d;
    }

    const created = [];
    for (let i = 0; i < count; i++) {
      // Retry on the rare unique-collision.
      let attempts = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const doc = await HotelListingCode.create({
            code: generateCode(),
            note,
            expiresAt,
            createdBy: user._id,
          });
          created.push(doc.toJSON());
          break;
        } catch (e: any) {
          if (e?.code === 11000 && attempts < 5) { attempts++; continue; }
          throw e;
        }
      }
    }

    res.status(201).json({ codes: created, count: created.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate codes', error: error.message });
  }
};

// @desc    List listing codes
// @route   GET /api/hotel-codes
// @access  Admin
export const getHotelCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const filter: Record<string, any> = {};
    if (req.query.status) filter.status = req.query.status;

    const [codes, total, activeCount, redeemedCount] = await Promise.all([
      HotelListingCode.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('redeemedBy', 'name email')
        .populate('redeemedHotel', 'name slug')
        .lean(),
      HotelListingCode.countDocuments(filter),
      HotelListingCode.countDocuments({ status: 'active' }),
      HotelListingCode.countDocuments({ status: 'redeemed' }),
    ]);

    res.status(200).json({
      codes: codes.map((c: any) => ({ ...c, id: c._id, _id: undefined })),
      total,
      stats: { active: activeCount, redeemed: redeemedCount },
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch codes', error: error.message });
  }
};

// @desc    Validate a code (does not redeem)
// @route   POST /api/hotel-codes/validate
// @access  Public (rate-limited at the route)
export const validateHotelCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!raw) {
      res.status(400).json({ valid: false, message: 'Code is required' });
      return;
    }
    const code = await HotelListingCode.findOne({ code: raw });
    if (!code) {
      res.status(404).json({ valid: false, message: 'Code not found' });
      return;
    }
    if (code.status === 'redeemed') {
      res.status(409).json({ valid: false, message: 'This code has already been used' });
      return;
    }
    if (code.status === 'revoked') {
      res.status(409).json({ valid: false, message: 'This code is no longer valid' });
      return;
    }
    if (code.expiresAt && code.expiresAt.getTime() < Date.now()) {
      res.status(409).json({ valid: false, message: 'This code has expired' });
      return;
    }
    res.status(200).json({ valid: true, message: 'Code is valid' });
  } catch (error: any) {
    res.status(500).json({ valid: false, message: 'Failed to validate code', error: error.message });
  }
};

// @desc    Revoke a code
// @route   DELETE /api/hotel-codes/:id
// @access  Admin
export const revokeHotelCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const code = await HotelListingCode.findById(id);
    if (!code) {
      res.status(404).json({ message: 'Code not found' });
      return;
    }
    if (code.status === 'redeemed') {
      res.status(400).json({ message: 'Cannot revoke a code that has already been used' });
      return;
    }
    code.status = 'revoked';
    await code.save();
    res.status(200).json({ message: 'Code revoked', code: code.toJSON() });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to revoke code', error: error.message });
  }
};

/**
 * Atomically redeem a code for a hotel. Returns the normalized code string on
 * success, or throws an Error with a user-facing message on failure.
 * Uses findOneAndUpdate with a status guard to avoid double-redemption races.
 */
export const redeemCodeForHotel = async (
  rawCode: string,
  userId: mongoose.Types.ObjectId | string,
  hotelId: mongoose.Types.ObjectId | string
): Promise<string> => {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) throw new Error('Access code is required');

  const existing = await HotelListingCode.findOne({ code });
  if (!existing) throw new Error('Invalid access code');
  if (existing.status === 'redeemed') throw new Error('This access code has already been used');
  if (existing.status === 'revoked') throw new Error('This access code is no longer valid');
  if (existing.expiresAt && existing.expiresAt.getTime() < Date.now()) {
    throw new Error('This access code has expired');
  }

  const updated = await HotelListingCode.findOneAndUpdate(
    { code, status: 'active' },
    { status: 'redeemed', redeemedBy: userId, redeemedHotel: hotelId, redeemedAt: new Date() },
    { new: true }
  );
  if (!updated) throw new Error('This access code has already been used');
  return code;
};
