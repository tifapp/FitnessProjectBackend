import express from "express"
import { IncomingHttpHeaders } from "http"
import {
  TiFAPIClient,
  TiFAPISchema,
  validateAPIRouterCall
} from "TiFBackendUtils"
import {
  APIHandler,
  APIMiddleware,
  APISchema,
  GenericEndpointSchema
} from "TiFShared/api/TransportTypes"
import { chainMiddleware, middlewareRunner } from "TiFShared/lib/Middleware"
import { MatchFnCollection } from "TiFShared/lib/Types/MatchType"
import { logger, Logger } from "TiFShared/logging"
import { authenticate, ResponseContext } from "./auth"
import { ServerEnvironment } from "./env"
import { catchAPIErrors } from "./errorHandler"

export type RouterParams = {
  context: ResponseContext
  environment: ServerEnvironment
  headers: IncomingHttpHeaders
  log: Logger
}

export type TiFAPIRouterExtension = TiFAPIClient<RouterParams>

export const endpoint = <Key extends keyof TiFAPIRouterExtension>(
  handle: TiFAPIRouterExtension[Key],
  ...middlewares: APIMiddleware<RouterParams>[]
) => {
  if (middlewares.length === 0) return handle
  return chainMiddleware(...middlewares, handle) as TiFAPIRouterExtension[Key]
}

export const authenticatedEndpoint = <Key extends keyof TiFAPIRouterExtension>(
  handle: TiFAPIRouterExtension[Key],
  ...middlewares: APIMiddleware<RouterParams>[]
) => {
  return endpoint(handle, ...[authenticate, ...middlewares])
}

// reason: express parses undefined inputs as empty objects
const emptyToUndefined = <T extends object>(obj: T) =>
  Object.keys(obj).length === 0 && obj.constructor === Object ? undefined : obj

/**
 * Adds the main routes to an app.
 *
 * @param app see {@link Application}
 * @param environment see {@link ServerEnvironment}
 */
export const TiFRouter = <Fns extends TiFAPIRouterExtension>(
  apiClient: MatchFnCollection<TiFAPIRouterExtension, Fns>,
  environment: ServerEnvironment,
  schema: APISchema = TiFAPISchema
) =>
    Object.entries(schema).reduce((router, [endpointName, endpointSchema]) => {
      const {
        httpRequest: { method, endpoint }
      } = endpointSchema as GenericEndpointSchema
      const handler: APIHandler<RouterParams> = middlewareRunner(
        catchAPIErrors,
        validateAPIRouterCall,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiClient[endpointName as keyof TiFAPIRouterExtension] as any
      )
      router[method.toLowerCase() as Lowercase<typeof method>](
        endpoint,
        async ({ body, query, params, headers }, res) => {
          const { status, data } = await handler({
            body: emptyToUndefined(body),
            query: emptyToUndefined(query),
            params: emptyToUndefined(params),
            headers,
            endpointName,
            endpointSchema,
            environment,
            context: res.locals as ResponseContext,
            log: logger(`tif.backend.${endpointName}`)
          })
          res.status(status).json(data)
        }
      )
      return router
    }, express.Router())
