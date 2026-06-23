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
