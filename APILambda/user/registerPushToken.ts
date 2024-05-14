import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ValidatedRouter } from "../validation.js"

const PushTokenPlatformNameSchema = z.union([
  z.literal("apple"),
  z.literal("android")
])

export type PushTokenPlatformName = z.infer<typeof PushTokenPlatformNameSchema>

const RegisterPushTokenRequestSchema = z.object({
  pushToken: z.string().nonempty(),
  platformName: PushTokenPlatformNameSchema
})

/**
 * Adds the push notification registration endpoint.
 */
export const createRegisterPushTokenRouter = (router: ValidatedRouter) => {
  router.postWithValidation(
    "/notifications/push/register",
    { bodySchema: RegisterPushTokenRequestSchema },
    async (req, res) => {
      return tryInsertPushToken(conn, {
        ...req.body,
        userId: res.locals.selfId
      })
        .mapSuccess((status) => res.status(201).send({ status }))
        .mapFailure((error) => res.status(400).send({ error }))
    }
  )
}

const tryInsertPushToken = (
  conn: SQLExecutable,
  insertRequest: {
    userId: string
    pushToken: string
    platformName: PushTokenPlatformName
  }
) => {
  return conn
    .executeResult(
      `
      INSERT IGNORE INTO pushTokens (userId, pushToken, platformName) 
      VALUES (:userId, :pushToken, :platformName)
      `,
      insertRequest
    )
    .flatMapSuccess((result) => {
      return result.rowsAffected > 0
        ? success("inserted" as const)
        : failure("token-already-registered" as const)
    })
}
