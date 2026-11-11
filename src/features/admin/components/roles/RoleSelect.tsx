import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { roleChoices, type RoleValue } from './roleChoices';

interface RoleSelectProps {
  targetId: string;
  /** The role the user has now (what the server will compare against). */
  targetRole: string;
  value: string;
  onChange: (role: string) => void;
}

const ROLE_LABEL: Record<RoleValue, string> = {
  buyer: 'Buyer',
  private_seller: 'Seller',
  agent: 'Agent',
  admin: 'Admin',
  super_admin: 'Super admin',
};
const ROLE_KEY: Record<RoleValue, string> = {
  buyer: 'users.roles.buyer',
  private_seller: 'users.roles.seller',
  agent: 'users.roles.agent',
  admin: 'users.roles.admin',
  super_admin: 'users.roles.superAdmin',
};

/** The role picker in the user editor: admin roles only for super admins, never your own. */
export const RoleSelect: React.FC<RoleSelectProps> = ({ targetId, targetRole, value, onChange }) => {
  const { t } = useTranslation('admin');
  const { state } = useAppContext();
  const me = state.currentUser;
  const choices = roleChoices({ actorId: me?.id ?? me?._id, actorRole: me?.role, targetId, targetRole });
  const hintId = `role-hint-${targetId}`;
  const hint =
    choices.lock === 'own'
      ? t('roleEditor.ownRole', 'You can’t change your own role. Ask another super admin.')
      : choices.lock === 'superAdminOnly'
        ? t('roleEditor.superAdminOnlyEdit', 'Only a super admin can change an admin’s role.')
        : choices.adminRolesNeedSuperAdmin
          ? t('roleEditor.superAdminOnlyGrant', 'Only a super admin can make someone admin or super admin.')
          : t('roleEditor.superAdminHint', 'Admins manage the site; super admins can also give and remove admin roles.');

  return (
    <div>
      <label htmlFor={`role-${targetId}`} className="block text-sm font-medium text-gray-700 mb-1">
        {t('userDetail.role', 'Role')}
      </label>
      <select
        id={`role-${targetId}`}
        value={value}
        disabled={!!choices.lock}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-500"
      >
        {choices.options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled && o.value !== value}>
            {t(ROLE_KEY[o.value], ROLE_LABEL[o.value])}
          </option>
        ))}
      </select>
      <p id={hintId} className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
};
