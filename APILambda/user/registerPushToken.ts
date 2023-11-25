import { z } from "zod"
import { ValidatedRouter } from "../validation.js"
import { SQLExecutable, conn } from "TiFBackendUtils"

const RegisterPushTokenRequestSchema = z.object({
  deviceToken: z.string().nonempty()
})

/**
 * Adds the push notification registration endpoint.
 */
export const createRegisterPushTokenRouter = (router: ValidatedRouter) => {
  router.postWithValidation(
    "/notifications/push/register",
    { bodySchema: RegisterPushTokenRequestSchema },
    async (req, res) => {
      return upsertPushToken(
        conn,
        res.locals.selfId,
        req.body.deviceToken
      ).mapSuccess((result) =>
        res.status(result === "inserted" ? 201 : 204).send()
      )
    }
  )
}

const upsertPushToken = (
  conn: SQLExecutable,
  userId: string,
  deviceToken: string
) =>
  conn
    .queryResult(
      "INSERT IGNORE INTO pushTokens (userId, deviceToken) VALUES (:userId, :deviceToken)",
      { userId, deviceToken }
    )
    .mapSuccess((result) => {
      return result.rowsAffected > 0
        ? ("inserted" as const)
        : ("no-change" as const)
    })
