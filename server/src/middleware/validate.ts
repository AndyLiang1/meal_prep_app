import type { Request, Response, NextFunction } from "express";
import { z } from "zod/v4";

interface ValidationSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, z.ZodError> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.body = result.error;
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.params = result.error;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.query = result.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      const details = Object.entries(errors).flatMap(([source, error]) =>
        error.issues.map((issue) => ({
          source,
          path: issue.path.join("."),
          message: issue.message,
        }))
      );
      res.status(400).json({ error: "Validation failed", details });
      return;
    }

    next();
  };
}
