import express from "express"
import { APIHandler, APIMiddleware, APISchema, resp } from "TiFShared/api"
import { validateAPICall } from "TiFShared/api/APIValidation"
import { TiFAPIClient, TiFAPISchema } from "TiFShared/api/TiFAPISchema"
import { middlewareRunner } from "TiFShared/lib/Middleware"
import { MatchFnCollection } from "TiFShared/lib/Types/MatchType"
import { ResponseContext } from "./auth"
import { ServerEnvironment } from "./env"

type RouterParams = {context: ResponseContext, environment: ServerEnvironment}

export type TiFAPIRouter = TiFAPIClient<RouterParams>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const catchAPIErrors: APIMiddleware<any> = async (input, next) => {
  try {
    return await next(input)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      status: 500,
      data: { error: error.message }
    }
  }
}

const validateAPIRouterCall = validateAPICall((status, value) => {
  if (status === "invalid-request") {
    return resp(400, { error: status })
  } else if (status === "invalid-response") {
    return resp(500, { error: status })
  }

  return value
})

const emptyToUndefined = <T extends object>(obj: T) => Object.keys(obj).length === 0 && obj.constructor === Object ? undefined : obj

/**
 * Adds the main routes to an app.
 *
 * @param app see {@link Application}
 * @param environment see {@link ServerEnvironment}
 */
export const TiFRouter = <Fns extends TiFAPIRouter>(apiClient: MatchFnCollection<TiFAPIRouter, Fns>, environment: ServerEnvironment, schema: APISchema = TiFAPISchema) => {
  const router = express.Router()

  Object.entries(schema).forEach(
    ([endpointName, endpointSchema]) => {
      const { httpRequest: { method, endpoint } } = endpointSchema
      const handler: APIHandler<RouterParams> = middlewareRunner(catchAPIErrors, validateAPIRouterCall, apiClient[endpointName as keyof TiFAPIRouter])
      router[method.toLowerCase() as Lowercase<typeof method>](
        endpoint,
        async ({ body, query, params }, res) => {
          const { status, data } = await handler({ body: emptyToUndefined(body), query: emptyToUndefined(query), params: emptyToUndefined(params), endpointName, endpointSchema, environment, context: res.locals as ResponseContext })
          res.status(status).json(data)
        }
      )
    }
  )

  return router
}

// EITHER abstract away the express router, or turn tifrouter into a middleware for express router. I like the middleware idea better, still not sure if we want to completely abstract the express router away and it might be confusing for new members.
// the middleware contains the routing logic
// then we dont even need the "implementationCollector". hmmmm

// if (error instanceof z.ZodError) {
//   // console.log("failed to validate request ", error)
//   return res.status(400).json({ error: "invalid-request" })
// } else {
//   // console.error("Error in validation middleware: ", error)
//   return res.status(500).json({ error: "internal-server-error" })
// }

// type ValidatedRequestHandler<S extends any> = ( // wait
//   req: Omit<Request, "body" | "query" | "params"> & any, /// wait until we integrate with router
//   res: Omit<Response, "locals"> & {locals: ResponseContext},
//   next: NextFunction
// ) => Promise<Result<Response, Response>>

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
// type ValidatedMethods = {
//   [Method in "getWithValidation" | "deleteWithValidation" | "patchWithValidation" | "postWithValidation" | "putWithValidation"]: <Schema extends TiFAPIInput>(
//     path: string,
//     schema: Partial<Schema>,
//     ...handlers: ValidatedRequestHandler<Schema>[]
//   ) => Router;
// };

// export type ValidatedRouter = Router & ValidatedMethods

// export type ValidatedRouteParams = {
//   httpMethod: "get" | "delete" | "patch" | "post" | "put",
//   path: string,
//   inputSchema: Partial<TiFAPIInput>
// }

// export const createValidatedRouter = (routeCollector?: (params: ValidatedRouteParams) => void): ValidatedRouter => {
//   const router = express.Router() as ValidatedRouter

//   const addRoute = (
//     httpMethod: ValidatedRouteParams["httpMethod"],
//     path: ValidatedRouteParams["path"],
//     inputSchema: ValidatedRouteParams["inputSchema"],
//     ...handlers: ValidatedRequestHandler<TiFAPIInput>[]
//   ) => {
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     router[httpMethod](path, validateRequest(inputSchema), ...(handlers as any))

//     // for swagger generation
//     routeCollector?.({ httpMethod, path, inputSchema })

//     return router
//   }

//   router.getWithValidation = (path, inputSchema, ...handlers) => addRoute("get", path, inputSchema, ...handlers)
//   router.deleteWithValidation = (path, inputSchema, ...handlers) => addRoute("delete", path, inputSchema, ...handlers)
//   router.patchWithValidation = (path, inputSchema, ...handlers) => addRoute("patch", path, inputSchema, ...handlers)
//   router.postWithValidation = (path, inputSchema, ...handlers) => addRoute("post", path, inputSchema, ...handlers)
//   router.putWithValidation = (path, inputSchema, ...handlers) => addRoute("put", path, inputSchema, ...handlers)

//   return router
// }

// export const withValidatedRequest = <Schema extends AnyZodObject>(
//   schema: Schema,
//   fn: (data: z.infer<Schema>, res: Response) => Promise<Result<Response, Response>>
// ): RequestHandler => {
//   return async (req: Request, res: Response) => {
//     try {
//       const data = await schema.passthrough().parseAsync(req)
//       return await fn(data, res)
//     } catch (err) {
//       return res.status(400).json(err)
//     }
//   }
// }

// EITHER abstract away the express router, or turn tifrouter into a middleware for express router. I like the middleware idea better, still not sure if we want to completely abstract the express router away and it might be confusing for new members.
// the middleware contains the routing logic
// then we dont even need the "implementationCollector". hmmmm
