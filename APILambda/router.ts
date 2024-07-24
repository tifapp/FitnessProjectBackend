import express from "express"
import { implementTiFAPI, TiFAPIClient } from "TiFShared/api/TiFAPISchema"
import { APIHandler } from "TiFShared/api/TransportTypes"
import { MatchFnCollection } from "TiFShared/lib/Types/MatchType"
import { ResponseContext } from "./auth"
import { ServerEnvironment } from "./env"

export type TiFAPIRouter = TiFAPIClient<{context: ResponseContext, environment: ServerEnvironment}>

/**
 * Adds the main routes to an app.
 *
 * @param app see {@link Application}
 * @param environment see {@link ServerEnvironment}
 */
export const TiFRouter = <Fns extends TiFAPIRouter>(implementations: MatchFnCollection<TiFAPIRouter, Fns>, environment: ServerEnvironment) => {
  const router = express.Router()

  implementTiFAPI(
    undefined,
    (endpointName, { httpRequest: { method, endpoint } }) => {
      router[method.toLowerCase() as Lowercase<typeof method>](
        endpoint,
        async ({ body, query, params }, res) => {
          const { status, data } = await (implementations[endpointName as keyof TiFAPIRouter] as APIHandler)({ body, query, params, context: res.locals, environment })
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
