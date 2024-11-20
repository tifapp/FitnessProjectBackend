import jwt from "jsonwebtoken"
import { envVars } from "TiFBackendUtils/env"
import { APIMiddleware, resp } from "TiFShared/api"
import { UserIDSchema } from "TiFShared/domain-models/User"
import { z } from "zod"
import { endpoint, RouterParams, TiFAPIRouterExtension } from "./router"

/**
 * Creates an endpoint that requires authentication.
 *
 * @param handle The function that runs the endpoint code.
 * @param middlewares Any middlewares that process the request before it reaches the endpoint handler.
 */
export const authenticatedEndpoint = <Key extends keyof TiFAPIRouterExtension>(
  handle: TiFAPIRouterExtension[Key],
  ...middlewares: APIMiddleware<RouterParams>[]
) => {
  return endpoint(handle, ...[authenticate, ...middlewares])
}

const TokenSchema = z
  .object({ id: UserIDSchema, name: z.string() })
  .passthrough()

const authenticate: APIMiddleware<RouterParams> = async (input, next) => {
  const authorization = input.headers.authorization
  if (!authorization) return resp(401, { error: "invalid-headers" })
  const splits = authorization.split(" ")
  if (splits.length !== 2) return resp(401, { error: "invalid-headers" })
  const body = await TokenSchema.safeParseAsync(
    jwt.verify(splits[1], envVars.JWT_SECRET)
  )
  if (!body.success) return resp(401, { error: "invalid-claims" })
  return await next({
    ...input,
    context: { selfId: body.data.id, name: body.data.name }
  })
}
