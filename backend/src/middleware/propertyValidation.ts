/**
 * Property Validation Middleware
 *
 * Input validation for property-related endpoints using express-validator.
 */

import { param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/** Run express-validator chains and short-circuit with 400 on failure. */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: ('path' in e ? e.path : 'param' in e ? (e as { param: string }).param : undefined),
        message: e.msg,
      })),
    });
    return;
  }
  next();
}

/**
 * Turn a Mongoose ValidationError into the same 400 shape
 * `handleValidationErrors` produces, and report whether it did.
 *
 * Without this a schema-level rejection (a listing marked under construction
 * with no usable completion year, say) reaches the controller's catch-all and
 * is reported as a 500 "Error creating property" — an input mistake dressed up
 * as a server fault, with nothing telling the seller which field to fix.
 */
export function respondIfValidationError(res: Response, error: unknown): boolean {
  const err = error as { name?: string; errors?: Record<string, { message?: string }> };
  if (!err || err.name !== 'ValidationError' || !err.errors) return false;

  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: Object.entries(err.errors).map(([field, detail]) => ({
      field,
      message: detail?.message ?? 'Invalid value',
    })),
  });
  return true;
}

/** Validates that :id is a well-formed MongoDB ObjectId. */
export const validatePropertyId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Property ID is required')
    .custom((value: string) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid property ID format');
      }
      return true;
    }),
  handleValidationErrors,
];
