/**
 * Spending one use of a discount code, safely.
 *
 * A use is taken only while uses are left and only if this person hasn't used
 * the code, in one atomic update, so two requests at the same moment can't
 * spend the same use. If what the code was for doesn't go through, the use is
 * given back.
 */
import mongoose from 'mongoose';
import DiscountCode from '../../models/DiscountCode';

export async function claimCodeUse(codeId: unknown, userId: string): Promise<boolean> {
  const actor = new mongoose.Types.ObjectId(userId);
  const claimed = await DiscountCode.findOneAndUpdate(
    { _id: codeId, isActive: true, usedBy: { $ne: actor }, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
    { $inc: { usedCount: 1 }, $push: { usedBy: actor } }
  );
  return claimed !== null;
}

/** Give back a use this person holds; does nothing if they hold none. */
export async function releaseCodeUse(code: { _id?: unknown; code?: string }, userId: string): Promise<void> {
  const actor = new mongoose.Types.ObjectId(userId);
  const filter = code._id ? { _id: code._id } : { code: code.code };
  await DiscountCode.updateOne(
    { ...filter, usedBy: actor, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 }, $pull: { usedBy: actor } }
  );
}
