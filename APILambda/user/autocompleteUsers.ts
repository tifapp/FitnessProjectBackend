import { SQLExecutable, UserHandle, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter, withValidatedRequest } from "../validation.js"
import { DatabaseUser } from "./models.js"

const AutocompleteUsersRequestSchema = z.object({
  query: z.object({
    handle: UserHandle.schema,
    limit: z
      .string()
      .transform((arg) => parseInt(arg))
      .refine((arg) => arg >= 1 && arg <= 50)
  })
})

/**
 * Adds an endpoint to the router that returns a list of users to autocomplete given their handle.
 */
export const autocompleteUsersRouter = (
  env: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.get(
    "/autocomplete",
    withValidatedRequest(AutocompleteUsersRequestSchema, (req, res) =>
      autocompleteUsers(
        conn,
        req.query.handle,
        req.query.limit
      ).mapSuccess(users => res.status(200).json({ users }))
    )
  )
}

const autocompleteUsers = (
  conn: SQLExecutable,
  baseHandle: UserHandle,
  limit: number
) => conn.queryResults<Pick<DatabaseUser, "id" | "name" | "handle">>(
  `
    SELECT id, name, handle 
    FROM user u 
    WHERE LOWER(u.handle) LIKE CONCAT(LOWER(:handle), '%') 
    ORDER BY u.handle ASC, u.creationDate ASC
    LIMIT :limit
    `,
  { handle: baseHandle, limit }
)
