/**
 * Payment Validation Middleware
 *
 * Input validation for payment-related endpoints using express-validator.
 * Sanitizes and validates all user input before it reaches controllers.
 */

import { body, param, validationResult, type ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { normalizeProductId } from '../utils/productIdNormalizer';

/**
 * Supported country codes for Balkan countries
 */
const SUPPORTED_COUNTRY_CODES = ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'];

/**
 * Supported plan names (includes both old and new IDs for backward compatibility)
 * Old IDs are normalized to canonical IDs after validation
 */
const SUPPORTED_PLAN_NAMES = [
  'buyer_pro_monthly',
  'pro_monthly',
  'pro_yearly',
  'enterprise',
  'agency_yearly',
  // Legacy IDs (will be normalized to canonical IDs)
  'seller_pro_monthly',
  'seller_pro_yearly',
  'seller_enterprise_yearly',
];

/**
 * Supported plan intervals
 */
const SUPPORTED_INTERVALS = ['month', 'year', 'one_time'];

/**
 * Supported payment providers
 */
const SUPPORTED_PROVIDERS = ['paysera', 'web'];

/**
 * Run validations and return 400 on failure
 */
function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({
        field: (e as any).path || (e as any).param,
        message: e.msg,
      })),
    });
    return;
  }
  next();
}

/**
 * Validation rules for POST /api/payments/create-payment
 */
export const validateCreatePayment: (ValidationChain | typeof handleValidationErrors)[] = [
  body('planName')
    .trim()
    .notEmpty().withMessage('Plan name is required')
    .isIn(SUPPORTED_PLAN_NAMES).withMessage('Invalid plan name'),

  body('planInterval')
    .optional()
    .trim()
    .isIn(SUPPORTED_INTERVALS).withMessage('Invalid plan interval'),

  body('amount')
    .isFloat({ min: 0, max: 10000 }).withMessage('Amount must be between 0 and 10,000 EUR'),

  body('productId')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Product ID too long')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Product ID contains invalid characters'),

  body('countryCode')
    .optional()
    .trim()
    .toUpperCase()
    .isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters')
    .isIn(SUPPORTED_COUNTRY_CODES).withMessage('Unsupported country'),

  body('language')
    .optional()
    .trim()
    .isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),

  body('preferredProvider')
    .optional()
    .trim()
    .isIn(SUPPORTED_PROVIDERS).withMessage('Invalid payment provider'),

  handleValidationErrors,
];

/**
 * Validation rules for GET /api/payments/providers/:countryCode
 */
export const validateCountryCode: (ValidationChain | typeof handleValidationErrors)[] = [
  param('countryCode')
    .trim()
    .toUpperCase()
    .isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters')
    .isAlpha().withMessage('Country code must be alphabetic'),

  handleValidationErrors,
];

/**
 * Validation rules for POST /api/payments/apply-free-subscription
 */
export const validateFreeSubscription: (ValidationChain | typeof handleValidationErrors)[] = [
  body('planName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Plan name too long'),

  body('planInterval')
    .optional()
    .trim()
    .isIn(SUPPORTED_INTERVALS).withMessage('Invalid plan interval'),

  body('productId')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Product ID too long'),

  body('discountCode')
    .trim()
    .notEmpty().withMessage('Discount code is required')
    .isLength({ max: 50 }).withMessage('Discount code too long')
    .matches(/^[A-Za-z0-9_-]+$/).withMessage('Discount code contains invalid characters'),

  handleValidationErrors,
];

/**
 * Middleware to normalize product IDs after validation
 * Maps old IDs to canonical IDs transparently
 */
export const normalizeProductIds = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body?.productId) {
    req.body.productId = normalizeProductId(req.body.productId);
  }
  if (req.body?.planName) {
    req.body.planName = normalizeProductId(req.body.planName);
  }
  next();
};
