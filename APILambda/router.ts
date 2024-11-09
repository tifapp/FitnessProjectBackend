import express from "express"
import {
  TiFAPIClient,
  TiFAPISchema,
  validateAPIRouterCall
} from "TiFBackendUtils"
import {
  APIHandler,
  APISchema,
  GenericEndpointSchema
} from "TiFShared/api/TransportTypes"
import { middlewareRunner } from "TiFShared/lib/Middleware"
import { MatchFnCollection } from "TiFShared/lib/Types/MatchType"
import { logger, Logger } from "TiFShared/logging"
import { ResponseContext } from "./auth"
import { ServerEnvironment } from "./env"
import { catchAPIErrors } from "./errorHandler"

export type RouterParams = {
  context: ResponseContext
  environment: ServerEnvironment
  log: Logger
}

export type TiFAPIRouterExtension = TiFAPIClient<RouterParams>

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler: APIHandler<RouterParams> = middlewareRunner(
      catchAPIErrors,
      validateAPIRouterCall,
      apiClient[endpointName as keyof TiFAPIRouterExtension] as any
    )
    router[method.toLowerCase() as Lowercase<typeof method>](
      endpoint,
      async ({ body, query, params }, res) => {
        const { status, data } = await handler({
          body: emptyToUndefined(body),
          query: emptyToUndefined(query),
          params: emptyToUndefined(params),
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
