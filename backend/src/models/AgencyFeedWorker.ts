import mongoose, { Document, Schema } from 'mongoose';

/**
 * Heartbeat of each running feed worker, so the dashboard can tell an agency
 * that its import is waiting because no worker is running — instead of
 * leaving it "queued" with no explanation. Expires two minutes after the
 * worker stops.
 */
export interface IAgencyFeedWorker extends Document {
  workerId: string;
  seenAt: Date;
}

const AgencyFeedWorkerSchema = new Schema<IAgencyFeedWorker>({
  workerId: { type: String, required: true, unique: true },
  seenAt: { type: Date, required: true },
});

AgencyFeedWorkerSchema.index({ seenAt: 1 }, { expireAfterSeconds: 120 });

/** A worker counts as online if it checked in within this window. */
export const WORKER_ONLINE_WINDOW_MS = 60_000;

export const isAnyFeedWorkerOnline = async (now: Date = new Date()): Promise<boolean> =>
  Boolean(await AgencyFeedWorker.exists({ seenAt: { $gte: new Date(now.getTime() - WORKER_ONLINE_WINDOW_MS) } }));

const AgencyFeedWorker = mongoose.model<IAgencyFeedWorker>('AgencyFeedWorker', AgencyFeedWorkerSchema);

export default AgencyFeedWorker;
