import { Request, Response, NextFunction, RequestHandler } from "express"
import type { ZodType } from "zod"

interface Schemas {
  body?: ZodType<any>
  params?: ZodType<any>
  query?: ZodType<any>
}


export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.validated) req.validated = {}

    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key]
      if (!schema) continue
      const result = schema.safeParse(req[key])
      if (!result.success) {
        return res.status(400).json({
          error: `Invalid request ${key}`,
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        })
      }
      req.validated[key] = result.data
    }

    next()
  }
}
