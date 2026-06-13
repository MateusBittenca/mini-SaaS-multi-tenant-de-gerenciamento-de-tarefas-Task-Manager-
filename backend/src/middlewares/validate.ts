import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

function assignValidated<T extends Record<string, unknown>>(
  req: Request,
  key: 'params' | 'query' | 'body',
  parsed: T
) {
  try {
    (req as Request & Record<string, unknown>)[key] = parsed;
  } catch {
    const target = req[key] as Record<string, unknown>;
    for (const k of Object.keys(target)) {
      delete target[k];
    }
    Object.assign(target, parsed);
  }
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        assignValidated(req, 'body', schemas.body.parse(req.body) as Record<string, unknown>);
      }
      if (schemas.params) {
        assignValidated(req, 'params', schemas.params.parse(req.params) as Record<string, unknown>);
      }
      if (schemas.query) {
        assignValidated(req, 'query', schemas.query.parse(req.query) as Record<string, unknown>);
      }
      next();
    } catch (error) {
      next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
    }
  };
}
