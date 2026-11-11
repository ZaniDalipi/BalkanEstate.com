import { Request, Response } from 'express';
import type { IUser } from '../models/User';
import { adminLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';
import { checkAdminStepUp } from '../middleware/adminStepUp';
import {
  authenticatorStatus,
  confirmAuthenticatorSetup,
  resetAuthenticator,
  startAuthenticatorSetup,
} from '../services/adminAuthenticatorService';
import { requestClaimCode, requestRoleGrantCode } from '../services/userRoleService';

const me = (req: Request) => req.user as IUser;
const failed = (res: Response, error: unknown, what: string) => {
  adminLogger.error(`${what} error:`, error);
  res.status(500).json({ message: `Error: ${what}` });
};

// @route   GET /api/admin/security/authenticator
export const getAuthenticator = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await authenticatorStatus(me(req)._id));
  } catch (error) {
    failed(res, error, 'authenticator status');
  }
};

// @desc    Start setting up the authenticator app: QR link + a code emailed to me.
//          Replacing an existing one needs a current code from it.
// @route   POST /api/admin/security/authenticator/setup
export const setupAuthenticator = async (req: Request, res: Response): Promise<void> => {
  try {
    if ((await authenticatorStatus(me(req)._id)).enabled && !(await checkAdminStepUp(req, res))) return;
    const result = await startAuthenticatorSetup(me(req));
    if (result.ok === false) {
      res.status(result.code === 'EMAIL_CODE_RATE_LIMITED' ? 429 : 503).json({ message: result.message, error: result.code });
      return;
    }
    res.json(result);
  } catch (error) {
    failed(res, error, 'authenticator setup');
  }
};

// @route   POST /api/admin/security/authenticator/confirm  { challengeId, emailCode, appCode }
export const confirmAuthenticator = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await confirmAuthenticatorSetup(me(req), {
      challengeId: req.body?.challengeId,
      emailCode: req.body?.emailCode,
      appCode: req.body?.appCode,
    });
    if (result.ok === false) {
      res.status(400).json({ message: result.message, error: result.code });
      return;
    }
    res.json(await authenticatorStatus(me(req)._id));
  } catch (error) {
    failed(res, error, 'authenticator confirm');
  }
};

// @desc    Remove another admin's authenticator (lost phone). Super admins; step-up via the DELETE rule.
// @route   DELETE /api/admin/users/:id/authenticator
export const resetUserAuthenticator = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const result = await resetAuthenticator(me(req), id);
    if (result.ok === false) {
      res.status(result.status).json({ message: result.message });
      return;
    }
    res.json({ message: 'Authenticator removed. They need to set it up again.' });
  } catch (error) {
    failed(res, error, 'authenticator reset');
  }
};

// @desc    Email me a code for making this user admin or super admin
// @route   POST /api/admin/users/:id/role/email-code  { role }
export const requestRoleEmailCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const result = await requestRoleGrantCode(me(req), id, req.body?.role);
    if (result.ok === false) {
      res.status(result.status).json({ message: result.message, error: result.code });
      return;
    }
    res.json(result);
  } catch (error) {
    failed(res, error, 'role email code');
  }
};

// @desc    Email me a code for claiming the first super admin role
// @route   POST /api/admin/super-admin/claim/email-code
export const requestClaimEmailCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await requestClaimCode(me(req));
    if (result.ok === false) {
      res.status(result.status).json({ message: result.message, error: result.code });
      return;
    }
    res.json(result);
  } catch (error) {
    failed(res, error, 'claim email code');
  }
};
