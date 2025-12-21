import React from 'react';
import {
  ChartBarIcon,
  TicketIcon,
  UsersIcon,
  HomeIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from '../../constants';

type AdminView = 'dashboard' | 'discounts' | 'promotionCoupons' | 'users' | 'properties' | 'agencies';

interface AdminNavProps {
  activeSection: AdminView;
  onSectionChange: (section: AdminView) => void;
}

const AdminNav: React.FC<AdminNavProps> = ({ activeSection, onSectionChange }) => {
  const navItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <ChartBarIcon className="w-5 h-5" /> },
    { id: 'discounts', label: 'Discount Codes', icon: <TicketIcon className="w-5 h-5" /> },
    { id: 'promotionCoupons', label: 'Promotion Coupons', icon: <SparklesIcon className="w-5 h-5" /> },
    { id: 'users', label: 'Users & Agents', icon: <UsersIcon className="w-5 h-5" /> },
    { id: 'properties', label: 'Properties', icon: <HomeIcon className="w-5 h-5" /> },
    { id: 'agencies', label: 'Agencies', icon: <BuildingOfficeIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="w-64 bg-white rounded-lg shadow-lg p-4 h-fit sticky top-24">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeSection === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AdminNav;
