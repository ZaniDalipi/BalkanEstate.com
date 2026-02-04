// Contact Information Configuration
// Centralized contact details for the BalkanEstate platform

export const CONTACT_CONFIG = {
  // Email addresses
  email: {
    info: 'info@balkanestateai.com',
    support: 'support@balkanestateai.com',
    contact: 'contact@balkanestateai.com',
    sales: 'sales@balkanestateai.com',
    privacy: 'privacy@balkanestateai.com',
    legal: 'legal@balkanestateai.com',
    refunds: 'refunds@balkanestateai.com',
  },

  // Phone numbers
  phone: {
    primary: '+389 71 967 915',
    primaryTel: '+38971967915', // For tel: links
  },

  // Company information
  company: {
    name: 'BalkanEstate AI',
    legalName: 'BalkanEstate AI DOOEL',
  },

  // Social media
  social: {
    whatsappNumber: '38971967915',
  },
} as const;

// Helper to format phone for tel: links
export const formatPhoneForLink = (phone: string): string => {
  return phone.replace(/[\s-]/g, '');
};
