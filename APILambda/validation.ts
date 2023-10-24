/* eslint-disable no-restricted-imports */
import { Result } from "TiFBackendUtils"
import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from "express"
import { AnyZodObject, ZodSchema, z } from "zod"

interface ValidationSchemas {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodySchema?: ZodSchema<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  querySchema?: ZodSchema<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pathParamsSchema?: ZodSchema<any>
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
export const validateRequest =
  ({ bodySchema, querySchema, pathParamsSchema }: ValidationSchemas) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validationSchema = z.object({
        // supertest sends {} by default, lambda gets null
          body: bodySchema ?? z.union([z.literal(null), z.object({}).strict()]),
          query: querySchema ?? z.union([z.literal(null), z.object({}).strict()]),
          params:
          pathParamsSchema ?? z.union([z.literal(null), z.object({}).strict()])
        })

        const { body, query, params } = await validationSchema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params
        })

        req.body = body
        req.query = query
        req.params = params

        next()
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.log("failed to validate request ", error)
          return res.status(400).json({ error: "invalid-request" })
        } else {
          console.error("Error in validation middleware: ", error)
          return res.status(500).json({ error: "internal-server-error" })
        }
      }
    }

// AnyZodObject breaks tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferRequestSchemaType<T> = T extends ZodSchema<any> ? z.infer<T> : never

type ValidatedRequestHandler<S extends ValidationSchemas> = (
  req: Omit<Request, "body" | "query" | "params"> & {
    body: InferRequestSchemaType<S["bodySchema"]>
    query: InferRequestSchemaType<S["querySchema"]>
    params: InferRequestSchemaType<S["pathParamsSchema"]>
  },
  res: Response,
  next: NextFunction
) => Promise<Result<Response, Response>>

/**
 * Wrapper around the Express Router which facilitates runtime validation and
 * TypeScript type inference for request handlers based on Zod schemas.
 *
 * Example Usage:
 * ```typescript
 * import { z } from 'zod';
 * import { createValidatedRouter } from './validated-router';  // Assume the file is named validated-router.ts
 *
 * // Define your schemas
 * const bodySchema = z.object({
 *   name: z.string(),
 *   age: z.number().positive(),
 * });
 *
 * const querySchema = z.object({
 *   sortBy: z.string().optional(),
 * });
 *
 * // Create an instance of ValidatedRouter
 * const router = new createValidatedRouter();
 *
 * // Define your route
 * router.post('/create-user', { bodySchema, querySchema }, (req, res) => {
 *   // At this point, req.body and req.query are correctly typed
 *   // and have been validated to match the schemas.
 *   // ...
 * });
 *
 * // To use this router in your express application:
 * app.use('/api', router.asRouter());
 * ```
 *
 * @class ValidatedRouter
 */
type ValidatedMethods = {
  [Method in "getWithValidation" | "deleteWithValidation" | "patchWithValidation" | "postWithValidation" | "putWithValidation"]: <Schema extends ValidationSchemas>(
    path: string,
    schema: Partial<Schema>,
    ...handlers: ValidatedRequestHandler<Schema>[]
  ) => Router;
};

export type ValidatedRouter = Router & ValidatedMethods

export const createValidatedRouter = (): ValidatedRouter => {
  const router = express.Router() as ValidatedRouter

  const addRoute = (
    httpMethod: "get" | "delete" | "patch" | "post" | "put",
    path: string,
    schema: Partial<ValidationSchemas>,
    ...handlers: ValidatedRequestHandler<ValidationSchemas>[]
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router[httpMethod](path, validateRequest(schema), ...(handlers as any))
    return router
  }

  router.getWithValidation = (path, schema, ...handlers) => addRoute("get", path, schema, ...handlers)
  router.deleteWithValidation = (path, schema, ...handlers) => addRoute("delete", path, schema, ...handlers)
  router.patchWithValidation = (path, schema, ...handlers) => addRoute("patch", path, schema, ...handlers)
  router.postWithValidation = (path, schema, ...handlers) => addRoute("post", path, schema, ...handlers)
  router.putWithValidation = (path, schema, ...handlers) => addRoute("put", path, schema, ...handlers)

  return router
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
