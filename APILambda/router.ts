import express from "express"
import { TiFAPIClient, TiFAPISchema } from "TiFBackendUtils"
import { validateAPICall } from "TiFShared/api/APIValidation"
import { resp } from "TiFShared/api/Transport"
import { APIHandler, APIMiddleware, APISchema, GenericEndpointSchema } from "TiFShared/api/TransportTypes"
import { middlewareRunner } from "TiFShared/lib/Middleware"
import { MatchFnCollection } from "TiFShared/lib/Types/MatchType"
import { ResponseContext } from "./auth"
import { ServerEnvironment } from "./env"

type RouterParams = {context: ResponseContext, environment: ServerEnvironment}

export type TiFAPIRouterExtension = TiFAPIClient<RouterParams>

const catchAPIErrors: APIMiddleware = async (input, next) => {
  try {
    return await next(input)
  } catch (error) {
    if (error instanceof Error) {
      return {
        status: 500,
        data: { error: error.message }
      }
    } else {
      return {
        status: 500,
        data: { error: `${error}` }
      }
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
export const TiFRouter = <Fns extends TiFAPIRouterExtension>(apiClient: MatchFnCollection<TiFAPIRouterExtension, Fns>, environment: ServerEnvironment, schema: APISchema = TiFAPISchema) => {
  const router = express.Router()

  Object.entries(schema).forEach(
    ([endpointName, endpointSchema]) => {
      // weird: fails typescript compiler without explicit cast
      const { httpRequest: { method, endpoint } } = endpointSchema as GenericEndpointSchema
      const handler: APIHandler<RouterParams> = middlewareRunner(catchAPIErrors, validateAPIRouterCall, apiClient[endpointName as keyof TiFAPIRouterExtension])
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
