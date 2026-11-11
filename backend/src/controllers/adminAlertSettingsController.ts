import { Request, Response } from 'express';
import SystemSettings from '../models/SystemSettings';
import type { IUser } from '../models/User';
import { adminLogger } from '../utils/logger';
import { MAX_ADMIN_ALERT_EMAILS, validateAdminEmailList } from '../utils/adminAlert';
import { adminAlertSettings, sendTestAdminAlert } from '../services/adminNotificationService';
import { activityLogger } from '../services/activityLogger';

const isSuperAdmin = (req: Request) => (req.user as IUser | undefined)?.role === 'super_admin';

async function settingsView(req: Request) {
  const s = await adminAlertSettings();
  return {
    emails: s.panelEmails,
    recipients: s.recipients,
    source: s.source,
    notifyNewUser: s.notifyNewUser,
    notifyNewProperty: s.notifyNewProperty,
    disabled: s.disabled,
    canEdit: isSuperAdmin(req),
    maxEmails: MAX_ADMIN_ALERT_EMAILS,
  };
}

// @desc    Who gets the admin alert emails
// @route   GET /api/admin/alert-settings
// @access  Private/Admin
export const getAdminAlertSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await settingsView(req));
  } catch (error) {
    adminLogger.error('Get admin alert settings error:', error);
    res.status(500).json({ message: 'Error loading alert settings' });
  }
};

// @desc    Set who gets the admin alert emails (empty list: use the server setting)
// @route   PUT /api/admin/alert-settings
// @access  Private/Super admin
export const updateAdminAlertSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSuperAdmin(req)) {
      res.status(403).json({ message: 'Only a super admin can change who gets the admin alerts.', error: 'SUPER_ADMIN_REQUIRED' });
      return;
    }
    const checked = validateAdminEmailList(req.body?.emails);
    if (checked.ok === false) {
      res.status(400).json({ message: checked.error, invalid: checked.invalid, error: 'INVALID_EMAILS' });
      return;
    }

    const settings = await SystemSettings.getSettings();
    const before = settings.adminNotificationEmails ?? [];
    settings.adminNotificationEmails = checked.emails;
    settings.lastModified = new Date();
    settings.modifiedBy = (req.user as IUser)._id as typeof settings.modifiedBy;
    await settings.save();

    const actor = req.user as IUser;
    activityLogger
      .logAdminAction(String(actor._id), actor.email, 'alert_emails_changed', undefined, { from: before, to: checked.emails })
      .catch(() => undefined);

    res.json(await settingsView(req));
  } catch (error) {
    adminLogger.error('Update admin alert settings error:', error);
    res.status(500).json({ message: 'Error saving alert settings' });
  }
};

// @desc    Send a test alert email to the current recipients
// @route   POST /api/admin/alert-settings/test
// @access  Private/Admin
export const testAdminAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = req.user as IUser;
    const result = await sendTestAdminAlert(actor.name || actor.email);
    if (result.ok === false) {
      const message =
        result.reason === 'NO_EMAIL_PROVIDER'
          ? 'Email sending is not set up on the server (no Resend or SMTP configured), so nothing can be sent.'
          : 'There is nobody to send to. Add an address first.';
      res.status(409).json({ message, error: result.reason });
      return;
    }
    res.json(result);
  } catch (error) {
    adminLogger.error('Test admin alert error:', error);
    res.status(500).json({ message: 'Error sending the test alert' });
  }
};
