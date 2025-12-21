// components/shared/AgencyBadge.tsx
import React from 'react';
import { Agency } from '../../types';
import { 
  BuildingOfficeIcon, 
  UserIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  HomeModernIcon,
  TrophyIcon,
  UserGroupIcon,
  HomeIcon
} from '../../constants';

export type AgencyBadgeVariant = 'default' | 'inverted' | 'minimal' | 'ghost';
export type AgencyBadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type AgencyType = 'independent' | 'standard' | 'luxury' | 'commercial' | 'boutique' | 'team';

interface AgencyBadgeProps {
  // Content
  agencyName?: string;
  agencyLogo?: string;
  agentName?: string;
  
  // Configuration
  type?: AgencyType;
  variant?: AgencyBadgeVariant;
  size?: AgencyBadgeSize;
  showIcon?: boolean;
  showText?: boolean;
  isCompact?: boolean;
  className?: string;
  onClick?: () => void;
  
  // Interactive
  clickable?: boolean;
  asLink?: boolean;
  href?: string;
}

const AgencyBadge: React.FC<AgencyBadgeProps> = ({
  agencyName,
  agencyLogo,
  agentName,
  type = agencyName ? 'standard' : 'independent',
  variant = 'default',
  size = 'md',
  showIcon = true,
  showText = true,
  isCompact = false,
  className = '',
  onClick,
  clickable = false,
  asLink = false,
  href
}) => {
  // Size configuration
  const sizeConfig = {
    xs: { 
      icon: 'w-3 h-3', 
      text: 'text-xs', 
      padding: 'px-1.5 py-0.5',
      gap: 'gap-1'
    },
    sm: { 
      icon: 'w-3.5 h-3.5', 
      text: 'text-xs', 
      padding: 'px-2 py-1',
      gap: 'gap-1.5'
    },
    md: { 
      icon: 'w-4 h-4', 
      text: 'text-sm', 
      padding: 'px-3 py-1.5',
      gap: 'gap-2'
    },
    lg: { 
      icon: 'w-5 h-5', 
      text: 'text-base', 
      padding: 'px-4 py-2',
      gap: 'gap-2.5'
    }
  };

  // Variant configuration
  const variantConfig = {
    default: 'bg-white/10 text-white',
    inverted: 'bg-gray-800 text-white',
    minimal: 'bg-transparent text-gray-700 border border-gray-200',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-50'
  };

  // Get the appropriate icon
  const renderIcon = () => {
    if (!showIcon) return null;
    
    if (agencyLogo) {
      return (
        <img 
          src={agencyLogo} 
          alt={agencyName || 'Agency'}
          className={`${sizeConfig[size].icon} flex-shrink-0 rounded object-contain`}
          onError={(e) => {
            // Fallback to default icon if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    const iconClass = `${sizeConfig[size].icon} flex-shrink-0`;
    
    switch (type) {
      case 'luxury':
        return <TrophyIcon className={iconClass} />;
      case 'commercial':
        return <BuildingLibraryIcon className={iconClass} />;
      case 'boutique':
        return <BanknotesIcon className={iconClass} />;
      case 'team':
        return <UserGroupIcon className={iconClass} />;
      case 'independent':
        return <UserIcon className={iconClass} />;
      default:
        return <BuildingOfficeIcon className={iconClass} />;
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (!showText) return null;
    
    if (!agencyName || type === 'independent') {
      return isCompact ? 'Ind' : 'Independent';
    }
    
    if (isCompact && agencyName.length > 12) {
      return `${agencyName.substring(0, 10)}...`;
    }
    
    return agencyName;
  };

  // Determine if it's independent
  const isIndependent = !agencyName || type === 'independent';

  // Base classes
  const baseClasses = `
    inline-flex items-center ${sizeConfig[size].gap} ${sizeConfig[size].padding} 
    rounded-lg transition-all duration-200 ${variantConfig[variant]}
    ${clickable ? 'cursor-pointer hover:opacity-90 active:scale-[0.98]' : ''}
    ${className}
  `.trim();

  // Content
  const content = (
    <>
      {renderIcon()}
      {showText && (
        <span className={`font-semibold truncate ${sizeConfig[size].text}`}>
          {getDisplayText()}
        </span>
      )}
    </>
  );

  // Render as link if needed
  if (asLink && href) {
    return (
      <a 
        href={href}
        className={baseClasses}
        onClick={onClick}
        title={agencyName || 'Independent Agent'}
      >
        {content}
      </a>
    );
  }

  // Render as button if clickable
  if (clickable || onClick) {
    return (
      <button
        type="button"
        className={baseClasses}
        onClick={onClick}
        title={agencyName || 'Independent Agent'}
      >
        {content}
      </button>
    );
  }

  // Default render
  return (
    <div 
      className={baseClasses}
      title={agencyName || 'Independent Agent'}
    >
      {content}
    </div>
  );
};

export default AgencyBadge;