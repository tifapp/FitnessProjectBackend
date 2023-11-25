import { z } from "zod"
import { ValidatedRouter } from "../validation.js"
import { SQLExecutable, conn } from "TiFBackendUtils"

const PlatformNameSchema = z.union([z.literal("apple"), z.literal("android")])

export type PlatformName = z.infer<typeof PlatformNameSchema>

const RegisterPushTokenRequestSchema = z.object({
  deviceToken: z.string().nonempty(),
  platformName: PlatformNameSchema
})

/**
 * Adds the push notification registration endpoint.
 */
export const createRegisterPushTokenRouter = (router: ValidatedRouter) => {
  router.postWithValidation(
    "/notifications/push/register",
    { bodySchema: RegisterPushTokenRequestSchema },
    async (req, res) => {
      return upsertPushToken(conn, {
        ...req.body,
        userId: res.locals.selfId
      }).mapSuccess((result) => {
        return res.status(result === "inserted" ? 201 : 400).send()
      })
    }
  )
}

const upsertPushToken = (
  conn: SQLExecutable,
  upsertRequest: {
    userId: string
    deviceToken: string
    platformName: PlatformName
  }
) => {
  return conn
    .queryResult(
      "INSERT IGNORE INTO pushTokens (userId, deviceToken, platformName) VALUES (:userId, :deviceToken, :platformName)",
      upsertRequest
    )
    .mapSuccess((result) => {
      return result.rowsAffected > 0
        ? ("inserted" as const)
        : ("no-change" as const)
    })
}
