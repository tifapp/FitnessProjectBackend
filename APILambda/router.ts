import express from "express"
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
import { ServerEnvironment } from "./env"
import { catchAPIErrors } from "./errorHandler"
import { IncomingHttpHeaders } from "http"
import { UserID } from "TiFShared/domain-models/User"

export type RequestContext = {
  selfId: UserID
  name: string
}

export type RouterParams = {
  context: RequestContext
  environment: ServerEnvironment
  headers: IncomingHttpHeaders
  log: Logger
}

export type TiFAPIRouterExtension = TiFAPIClient<RouterParams>

/**
 * Creates an endpoint handler.
 *
 * @param handle The function that runs the endpoint code.
 * @param middlewares Any middlewares that process the request before it reaches the endpoint handler.
 */
export const endpoint = <Key extends keyof TiFAPIRouterExtension>(
  handle: TiFAPIRouterExtension[Key],
  ...middlewares: APIMiddleware<RouterParams>[]
) => {
  if (middlewares.length === 0) return handle
  // NB: instanceof checks don't work for UserHandle/ColorString, possibly due to peer dependencies
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore .toJSON() here causes a build issue for some reason
  return chainMiddleware(...middlewares, handle) as TiFAPIRouterExtension[Key]
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
) => {
  return Object.entries(schema).reduce(
    (router, [endpointName, endpointSchema]) => {
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
            context: res.locals as RequestContext,
            log: logger(`tif.backend.${endpointName}`)
          })
          res.status(status).json(data)
        }
      )
      return router
    },
    express.Router()
  )
}
