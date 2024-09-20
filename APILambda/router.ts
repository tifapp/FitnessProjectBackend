import express from "express"
import { TiFAPIClient, TiFAPISchema } from "TiFBackendUtils"
import { validateAPICall } from "TiFShared/api/APIValidation"
import { resp } from "TiFShared/api/Transport"
import { APIHandler, APIMiddleware, APISchema } from "TiFShared/api/TransportTypes"
import { middlewareRunner } from "TiFShared/lib/Middleware"
import { MatchFnCollection } from "TiFShared/lib/Types/MatchType"
import { ResponseContext } from "./auth"
import { ServerEnvironment } from "./env"

type RouterParams = {context: ResponseContext, environment: ServerEnvironment}

export type TiFAPIRouterExtension = TiFAPIClient<RouterParams>

const catchAPIErrors: APIMiddleware = async (input, next) => {
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
export const TiFRouter = <Fns extends TiFAPIRouterExtension>(apiClient: MatchFnCollection<TiFAPIRouterExtension, Fns>, environment: ServerEnvironment, schema: APISchema = TiFAPISchema) => {
  const router = express.Router()

  Object.entries(schema).forEach(
    ([endpointName, endpointSchema]) => {
      const { httpRequest: { method, endpoint } } = endpointSchema
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
