import jwt from "jsonwebtoken"
import { envVars } from "TiFBackendUtils/env"
import { APIMiddleware, resp } from "TiFShared/api"
import { UserID, UserIDSchema } from "TiFShared/domain-models/User"
import { z } from "zod"
import { RouterParams } from "./router"

export type ResponseContext = {
  selfId: UserID
  name: string
}

const TokenSchema = z
  .object({ id: UserIDSchema, name: z.string() })
  .passthrough()

export const authenticate: APIMiddleware<RouterParams> = async (
  input,
  next
) => {
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
