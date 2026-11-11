import { NextFunction, Request, Response } from 'express';
import type { IUser } from '../models/User';
import { verifyStepUpCode } from '../services/adminAuthenticatorService';
import { adminStepUpRequired } from '../utils/adminStepUpRules';

/** The authenticator code for a risky admin action travels in this header. */
export const ADMIN_CODE_HEADER = 'x-admin-code';

/** Check the request's authenticator code; answers 403 with the reason when it is missing or wrong. */
export async function checkAdminStepUp(req: Request, res: Response): Promise<boolean> {
  const user = req.user as IUser | undefined;
  if (!user) {
    res.status(401).json({ message: 'Authentication required', error: 'NOT_AUTHENTICATED' });
    return false;
  }
  const result = await verifyStepUpCode(user._id, req.get(ADMIN_CODE_HEADER));
  if (result.ok === false) {
    res.status(403).json({ message: result.message, error: result.code });
    return false;
  }
  return true;
}

/** Always ask for an authenticator code (for admin routes outside /api/admin). */
export const requireAdminStepUp = (req: Request, res: Response, next: NextFunction): void => {
  checkAdminStepUp(req, res).then((ok) => ok && next()).catch(next);
};

/** For /api/admin: ask for a code only on the risky requests (see adminStepUpRules). */
export const adminStepUpGate = (req: Request, res: Response, next: NextFunction): void => {
  if (!adminStepUpRequired(req.method, req.path)) {
    next();
    return;
  }
  requireAdminStepUp(req, res, next);
};
