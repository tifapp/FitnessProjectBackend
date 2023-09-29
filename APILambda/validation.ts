/* eslint-disable no-restricted-imports */
import express, { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { AnyZodObject, ZodSchema, z } from "zod";

interface ValidationSchemas {
  bodySchema?: ZodSchema<any>;
  querySchema?: ZodSchema<any>;
  pathParamsSchema?: ZodSchema<any>;
}

/**
 * Validates a request with the given zod schema and returns a 400 error status code
 * if the request doesn't match the zod schema.
 *
 * @internal
 * @example
 * ```ts
 * const CreateUserSchema = z.object({
 *   body: z.object({
 *     name: z.string().max(50),
 *     handle: z.string().regex(/^[a-z_0-9]{1,15}$/),
 *   }),
 * });
 *
 * // In some router
 *
 * const bodySchema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 * const querySchema = z.object({
 *   sortBy: z.string().optional(),
 * });
 *
 * app.post('/example', validateRequest({body: bodySchema, query: querySchema}), (req, res) => {
 *   res.send('Success');
 * });
 * ```
 */
export const validateRequest = ({ bodySchema, querySchema, pathParamsSchema }: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(req.query, querySchema)
      if (bodySchema) {
        req.body = bodySchema.parse(req.body)
      } else if (Object.keys(req.body).length !== 0) {
        throw new Error("Unexpected request body provided")
      }

      if (querySchema) {
        req.query = querySchema.parse(req.query)
      } else if (Object.keys(req.query).length !== 0) {
        throw new Error("Unexpected query parameters provided")
      }

      if (pathParamsSchema) {
        req.params = pathParamsSchema.parse(req.params)
      } else if (Object.keys(req.params).length !== 0) {
        throw new Error("Unexpected path parameters provided")
      }

      next()
    } catch (error) {
      console.log("failed to validate request ", error)
      return res.status(400).json({ error: "invalid-request" })
    }
  }

export class ValidatedRouter {
  private router: Router

  constructor () {
    this.router = express.Router()
  }

  get (path: string, schema: Pick<ValidationSchemas, "querySchema" | "pathParamsSchema">, ...handlers: RequestHandler[]): this {
    this.router.get(path, validateRequest(schema), ...handlers)
    return this
  }

  delete (path: string, schema: ValidationSchemas, ...handlers: RequestHandler[]): this {
    this.router.delete(path, validateRequest(schema), ...handlers)
    return this
  }

  patch (path: string, schema: ValidationSchemas, ...handlers: RequestHandler[]): this {
    this.router.patch(path, validateRequest(schema), ...handlers)
    return this
  }

  put (path: string, schema: ValidationSchemas, ...handlers: RequestHandler[]): this {
    this.router.put(path, validateRequest(schema), ...handlers)
    return this
  }

  post (path: string, schema: ValidationSchemas, ...handlers: RequestHandler[]): this {
    this.router.post(path, validateRequest(schema), ...handlers)
    return this
  }

  asRouter (): Router {
    return this.router
  }
}

export const withValidatedRequest = <Schema extends AnyZodObject>(
  schema: Schema,
  fn: (data: z.infer<Schema>, res: Response) => Promise<Response>
): RequestHandler => {
  return async (req: Request, res: Response) => {
    try {
      const data = await schema.passthrough().parseAsync(req)
      return await fn(data, res)
    } catch (err) {
      return res.status(400).json(err)
    }
  }
}
