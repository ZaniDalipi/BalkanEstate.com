/**
 * Buyer inquiries about a specific unit of a published development — the
 * route for apartments that have no published listing of their own (and an
 * extra entry point for those that do).
 *
 * Persisted as an ordinary Inquiry (type 'development') addressed to the
 * development's owner, so it shows up wherever that user's inquiries are read.
 * The notification email is best effort: a mail failure never fails the
 * buyer's request, because the inquiry is already saved.
 */
import mongoose from 'mongoose';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import Inquiry from '../../models/Inquiry';
import Property from '../../models/Property';
import User from '../../models/User';
import { createLogger } from '../../utils/logger';
import { ValidationError } from './developmentService';
import { NotFoundError } from './developmentListingService';
import { toObjectId } from './developmentRefs';
import { loadPublishedDevelopment, visibleUnitFilter } from './developmentPublicService';

const log = createLogger('UnitInquiryService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A 403 with a machine-readable code the explorer uses to hide the form. */
export class InquiriesDisabledError extends Error {
  readonly statusCode = 403;
  readonly code = 'inquiries_disabled';
  constructor() {
    super('This development does not accept unit inquiries');
    this.name = 'InquiriesDisabledError';
  }
}

class InquiryValidationError extends ValidationError {
  constructor(public readonly errors: { field: string; message: string }[]) {
    super(errors[0]?.message ?? 'Invalid inquiry');
  }
}

export interface UnitInquiryInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

/** Validate and normalise the public payload; throws a 400 listing every bad field. */
export const validateUnitInquiry = (raw: unknown): UnitInquiryInput => {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const message = str(body.message);
  const errors: { field: string; message: string }[] = [];

  if (name.length < 2 || name.length > 100) errors.push({ field: 'name', message: 'Name must be 2–100 characters' });
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    errors.push({ field: 'email', message: 'A valid email is required' });
  }
  if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
    errors.push({ field: 'phone', message: 'Phone must be text' });
  } else if (phone.length > 40) errors.push({ field: 'phone', message: 'Phone must be at most 40 characters' });
  if (message.length < 10 || message.length > 2000) {
    errors.push({ field: 'message', message: 'Message must be 10–2000 characters' });
  }
  if (errors.length) throw new InquiryValidationError(errors);
  return { name, email, phone: phone || undefined, message };
};

export const sendUnitInquiry = async (params: {
  slug: unknown;
  unitId: unknown;
  payload: unknown;
  buyerId?: mongoose.Types.ObjectId | string;
}): Promise<{ inquiryId: string }> => {
  const development = await loadPublishedDevelopment(params.slug);
  const developmentId = development._id as mongoose.Types.ObjectId;
  const unitId = toObjectId(params.unitId);
  if (!unitId) throw new NotFoundError('Unit not found', { code: 'UNIT_NOT_FOUND' });
  const unit = await DevelopmentUnit.findOne({ _id: unitId, ...visibleUnitFilter(developmentId) });
  if (!unit) throw new NotFoundError('Unit not found', { code: 'UNIT_NOT_FOUND' });
  if (development.allowUnitInquiries === false) throw new InquiriesDisabledError();

  const input = validateUnitInquiry(params.payload);

  const [owner, primaryListing] = await Promise.all([
    User.findById(development.ownerId).select('name email').lean(),
    unit.primaryListingId
      ? Property.findOne({ _id: unit.primaryListingId, status: { $ne: 'draft' } }).select('_id title').lean()
      : Promise.resolve(null),
  ]);

  const subjectTitle = `${development.name} — Unit ${unit.unitNumber}`;
  const location = [development.city, development.country].filter(Boolean).join(', ');

  const inquiry = await Inquiry.create({
    type: 'development',
    status: 'new',
    buyerName: input.name,
    buyerEmail: input.email,
    buyerPhone: input.phone,
    buyerId: params.buyerId,
    recipientId: owner?._id ?? development.ownerId,
    recipientName: owner?.name,
    recipientEmail: owner?.email,
    developmentId,
    unitId: unit._id,
    // With a published primary listing the inquiry is also tied to it, but
    // the unit/development refs are always recorded.
    propertyId: primaryListing?._id,
    propertyTitle: subjectTitle,
    message: input.message,
    location,
  });

  if (owner?.email) {
    // Lazy import keeps the heavy email module off this module's load path.
    void import('../emailService')
      .then(({ sendAgentInquiry }) =>
        sendAgentInquiry({
          agentEmail: owner.email,
          agentName: owner.name,
          buyerName: input.name,
          buyerEmail: input.email,
          buyerPhone: input.phone,
          message: input.message,
          propertyTitle: subjectTitle,
          propertyId: primaryListing ? String(primaryListing._id) : undefined,
          location,
          inquiryType: 'general',
        })
      )
      .catch((err) => log.warn(`Unit inquiry email failed for inquiry ${String(inquiry._id)}:`, err));
  }

  log.info(`Unit inquiry ${String(inquiry._id)} saved for development ${String(developmentId)}`);
  return { inquiryId: String(inquiry._id) };
};
