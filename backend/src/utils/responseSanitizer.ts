/**
 * Response Sanitizer
 *
 * Strips sensitive fields from API responses to prevent PII leakage.
 * Used across controllers to ensure consistent data minimization.
 */

/** Fields that should NEVER appear in any public-facing API response */
const ALWAYS_STRIP_FIELDS = ['__v', 'password', 'resetPasswordToken', 'resetPasswordExpires',
  'emailVerificationToken', 'emailVerificationExpires', 'refreshTokens', 'loginHistory',
  'loginAttempts', 'lockUntil', 'lastFailedLogin'] as const;

/** Property snapshot fields that expose creator PII */
const PROPERTY_CREATOR_PII_FIELDS = ['createdByEmail', 'createdByLicenseNumber'] as const;

/**
 * Rounds a coordinate to the specified number of decimal places.
 * 5 decimals ≈ 1.1m accuracy — sufficient for property listings.
 */
const roundCoordinate = (value: number, decimals = 5): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Strip internal MongoDB fields from any object.
 */
const stripInternalFields = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const cleaned = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const field of ALWAYS_STRIP_FIELDS) {
    delete cleaned[field];
  }

  return cleaned;
};

/**
 * Sanitize a populated seller object.
 * For list views: strip email, phone, licenseNumber.
 * For detail views: keep phone (needed for "Call Seller" button), strip email and licenseNumber.
 */
const sanitizeSeller = (seller: any, context: 'list' | 'detail'): any => {
  if (!seller || typeof seller !== 'object') return seller;

  const cleaned = { ...seller };

  // Always strip email and licenseNumber — frontend never uses these
  delete cleaned.email;
  delete cleaned.licenseNumber;

  // Strip phone from list views only (detail page needs it for "Call Seller" button)
  if (context === 'list') {
    delete cleaned.phone;
  }

  return stripInternalFields(cleaned);
};

/**
 * Sanitize a property object for API response.
 *
 * @param property - Raw property object (from .toObject() or .lean())
 * @param context - 'list' for bulk responses, 'detail' for single property views
 */
export const sanitizeProperty = (property: any, context: 'list' | 'detail' = 'list'): any => {
  if (!property || typeof property !== 'object') return property;

  const cleaned = { ...property };

  // Strip creator PII snapshot fields (frontend never uses these)
  for (const field of PROPERTY_CREATOR_PII_FIELDS) {
    delete cleaned[field];
  }

  // Sanitize the populated seller object
  if (cleaned.sellerId && typeof cleaned.sellerId === 'object') {
    cleaned.sellerId = sanitizeSeller(cleaned.sellerId, context);
  }

  // Round GPS coordinates to 5 decimal places (~1.1m accuracy)
  if (typeof cleaned.lat === 'number') {
    cleaned.lat = roundCoordinate(cleaned.lat);
  }
  if (typeof cleaned.lng === 'number') {
    cleaned.lng = roundCoordinate(cleaned.lng);
  }

  return stripInternalFields(cleaned);
};

/**
 * Sanitize a conversation participant (buyer or seller) for API response.
 * Frontend only needs: name, avatarUrl, role, agencyName.
 */
export const sanitizeParticipant = (participant: any): any => {
  if (!participant || typeof participant !== 'object') return participant;

  const cleaned = { ...participant };

  // Strip PII — frontend conversation transformer only extracts name, avatarUrl, role, agencyName
  delete cleaned.email;
  delete cleaned.phone;

  return stripInternalFields(cleaned);
};

/**
 * Sanitize a conversation object for API response.
 */
export const sanitizeConversation = (conversation: any): any => {
  if (!conversation || typeof conversation !== 'object') return conversation;

  const cleaned = { ...conversation };

  // Sanitize buyer and seller participants
  if (cleaned.buyerId && typeof cleaned.buyerId === 'object') {
    cleaned.buyerId = sanitizeParticipant(cleaned.buyerId);
  }
  if (cleaned.sellerId && typeof cleaned.sellerId === 'object') {
    cleaned.sellerId = sanitizeParticipant(cleaned.sellerId);
  }

  // Sanitize the nested property's seller if populated
  if (cleaned.propertyId && typeof cleaned.propertyId === 'object') {
    if (cleaned.propertyId.sellerId && typeof cleaned.propertyId.sellerId === 'object') {
      cleaned.propertyId.sellerId = sanitizeParticipant(cleaned.propertyId.sellerId);
    }
  }

  return stripInternalFields(cleaned);
};
