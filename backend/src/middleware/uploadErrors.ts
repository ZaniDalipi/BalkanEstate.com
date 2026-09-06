import { NextFunction, Request, RequestHandler, Response } from 'express';
import { MulterError } from 'multer';

interface UploadErrorContext {
  /** Form field the route expects files under (e.g. 'images'). */
  field?: string;
  /** Maximum number of files the route accepts for that field. */
  maxFiles?: number;
  /** Maximum size per file, in bytes. */
  maxFileSizeBytes?: number;
}

const mb = (bytes: number): string => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

/**
 * Translate a multer error into an HTTP status and a message a user can act on.
 *
 * Multer's own messages are internal shorthand ("Unexpected field", "File too
 * large") and, because they carry no statusCode, they otherwise fall through to
 * the generic error handler as a 500.
 */
export const describeUploadError = (
  err: MulterError,
  { field, maxFiles, maxFileSizeBytes }: UploadErrorContext = {}
): { status: number; message: string } => {
  const fieldLabel = field ?? err.field ?? 'file';

  switch (err.code) {
    case 'LIMIT_UNEXPECTED_FILE':
      // Multer raises this both for an unknown field name and for one file too
      // many on a known field, so cover both cases in one message.
      return {
        status: 400,
        message: maxFiles
          ? `Too many files, or the wrong upload field was used. Send at most ${maxFiles} file${maxFiles === 1 ? '' : 's'} in the "${fieldLabel}" field.`
          : `Unexpected upload field "${fieldLabel}".`,
      };
    case 'LIMIT_FILE_COUNT':
      return {
        status: 400,
        message: maxFiles
          ? `Too many files. You can upload at most ${maxFiles} at a time.`
          : 'Too many files in this upload.',
      };
    case 'LIMIT_FILE_SIZE':
      return {
        status: 413,
        message: maxFileSizeBytes
          ? `A file is too large. Each file must be under ${mb(maxFileSizeBytes)}.`
          : 'A file in this upload is too large.',
      };
    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
      return { status: 400, message: 'The upload form data is too large or malformed.' };
    default:
      return { status: 400, message: 'File upload failed. Please try again.' };
  }
};

/**
 * Wrap a multer middleware so its errors become clear 4xx JSON responses
 * instead of reaching the generic error handler as a 500.
 */
export const withUploadErrors = (
  uploadMiddleware: RequestHandler,
  context: UploadErrorContext = {}
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    uploadMiddleware(req, res, (err?: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof MulterError) {
        const { status, message } = describeUploadError(err, context);
        res.status(status).json({ message, code: err.code });
        return;
      }

      // fileFilter rejections are plain Errors with a user-facing message
      // (e.g. "Not an image!"); anything else is unexpected, so pass it on.
      if (err instanceof Error && err.message) {
        res.status(400).json({ message: err.message });
        return;
      }

      next(err);
    });
  };
};

/**
 * Safety net for upload routes that are not wrapped with withUploadErrors.
 * Mounted before the generic error handler.
 */
export const uploadErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof MulterError) {
    const { status, message } = describeUploadError(err);
    res.status(status).json({ message, code: err.code });
    return;
  }
  next(err);
};
