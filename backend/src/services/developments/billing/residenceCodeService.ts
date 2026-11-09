/**
 * Admin › Residences › Unlock codes: create codes, list them with where they
 * stand and which residences used them, switch them off and on, mark them
 * sent, and delete one nobody used. Checkout (residencePurchaseService) spends
 * them unchanged.
 */
import mongoose from 'mongoose';
import DiscountCode from '../../../models/DiscountCode';
import Development from '../../../models/Development';
import ResidencePurchase from '../../../models/ResidencePurchase';
import { NotFoundError } from '../developmentListingService';
import { ValidationError } from '../developmentService';
import { BillingError } from './billingErrors';
import { codeStatus, kindOf, newResidenceCode, parseCreateCodes, RESIDENCE_CODE_PRODUCTS, RESIDENCE_PRODUCT_IDS, statusQuery } from './residenceCodes';

const PAGE_SIZE = 25;
const MAX_TRIES = 5;

const isDuplicate = (e: unknown) => (e as { code?: number })?.code === 11000;

/** Create `count` codes; each covers the whole price of the product it names. */
export async function createResidenceCodes(adminId: unknown, body: Record<string, unknown> | undefined, now = new Date()) {
  const input = parseCreateCodes(body, now);
  const codes: string[] = [];
  for (let i = 0; i < input.count; i += 1) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const doc = await DiscountCode.create({
          code: newResidenceCode(),
          discountType: 'percentage',
          discountValue: 100,
          validFrom: now,
          validUntil: input.validUntil,
          usageLimit: input.usageLimit,
          applicablePlans: [RESIDENCE_CODE_PRODUCTS[input.kind]],
          source: 'residence',
          description: input.note,
          createdBy: adminId,
          isActive: true,
        });
        codes.push(doc.code);
        break;
      } catch (e) {
        if (!isDuplicate(e) || attempt >= MAX_TRIES) throw e;
      }
    }
  }
  return { codes, kind: input.kind, validUntil: input.validUntil, usageLimit: input.usageLimit };
}

const SEARCH = /^[A-Za-z0-9-]{1,40}$/;

/** GET list: residence codes, newest first, with status and the residences that used each. */
export async function listResidenceCodes(query: Record<string, unknown>, now = new Date()) {
  const page = Math.max(1, Math.min(1000, Number.parseInt(String(query.page ?? '1'), 10) || 1));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search && !SEARCH.test(search)) throw new ValidationError('search may only hold letters, digits and dashes', { code: 'FIELD_INVALID', field: 'search' });
  const filter: Record<string, unknown> = {
    applicablePlans: { $in: RESIDENCE_PRODUCT_IDS },
    ...statusQuery(query.status, now),
    ...(search ? { code: { $regex: search.toUpperCase().replace(/-/g, '\\-') } } : {}),
  };
  const [docs, total] = await Promise.all([
    DiscountCode.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate('createdBy', 'name').lean(),
    DiscountCode.countDocuments(filter),
  ]);
  const purchases = docs.length
    ? await ResidencePurchase.find({ couponCode: { $in: docs.map((d) => d.code) } }).select('couponCode developmentId createdAt').sort({ createdAt: 1 }).lean()
    : [];
  const devIds = Array.from(new Set(purchases.map((p) => String(p.developmentId))));
  const devs = devIds.length ? await Development.find({ _id: { $in: devIds } }).select('name slug').lean() : [];
  const devById = new Map(devs.map((d) => [String(d._id), d as { name: string; slug: string }]));
  const usesByCode = new Map<string, { residence: { name: string; slug: string } | null; at: Date }[]>();
  for (const p of purchases) {
    const list = usesByCode.get(p.couponCode as string) ?? [];
    list.push({ residence: devById.get(String(p.developmentId)) ?? null, at: p.createdAt as Date });
    usesByCode.set(p.couponCode as string, list);
  }
  return {
    items: docs.map((d) => ({
      id: String(d._id),
      code: d.code,
      kind: kindOf(d.applicablePlans),
      status: codeStatus(d, now),
      usedCount: d.usedCount,
      usageLimit: d.usageLimit,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      note: d.description ?? null,
      isSent: !!d.isSent,
      sentAt: d.sentAt ?? null,
      createdAt: d.createdAt,
      createdBy: (d.createdBy as { name?: string } | null)?.name ?? null,
      uses: usesByCode.get(d.code) ?? [],
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** One residence code (any other discount code is "not found" here). */
async function loadCode(id: string) {
  const code = mongoose.isValidObjectId(id) ? await DiscountCode.findOne({ _id: id, applicablePlans: { $in: RESIDENCE_PRODUCT_IDS } }) : null;
  if (!code) throw new NotFoundError('Code not found', { code: 'CODE_NOT_FOUND' });
  return code;
}

/** PATCH { isActive?, isSent? } */
export async function updateResidenceCode(id: string, body: Record<string, unknown> | undefined) {
  const code = await loadCode(id);
  const { isActive, isSent } = body ?? {};
  if (isActive === undefined && isSent === undefined) throw new ValidationError('nothing to change', { code: 'NO_CHANGES' });
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') throw new ValidationError('isActive must be true or false', { code: 'FIELD_INVALID', field: 'isActive' });
    code.isActive = isActive;
  }
  if (isSent !== undefined) {
    if (typeof isSent !== 'boolean') throw new ValidationError('isSent must be true or false', { code: 'FIELD_INVALID', field: 'isSent' });
    code.isSent = isSent;
    code.sentAt = isSent ? new Date() : undefined;
  }
  await code.save();
  return { id: String(code._id), isActive: code.isActive, isSent: code.isSent };
}

/** DELETE: only a code nobody has used (a used one stays, for the ledger; switch it off instead). */
export async function deleteResidenceCode(id: string) {
  const code = await loadCode(id);
  if (code.usedCount > 0) throw new BillingError('CODE_IN_USE', 'This code was used; switch it off instead.', { used: code.usedCount }, 409);
  await DiscountCode.deleteOne({ _id: code._id, usedCount: 0 });
  return { id };
}
