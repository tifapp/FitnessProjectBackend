import { UserHandle } from "TiFBackendUtils"
import { z } from "zod"
import { SQLExecutable, queryResults } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"
import { withValidatedRequest } from "../validation.js"
// eslint-disable-next-line no-restricted-imports
import { Router } from "express"

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
  router: Router
) => {
  router.get(
    "/autocomplete",
    withValidatedRequest(AutocompleteUsersRequestSchema, async (req, res) => {
      const users = await autocompleteUsers(
        env.conn,
        req.query.handle,
        req.query.limit
      )
      return res.status(200).json({ users })
    })
  )
}

const autocompleteUsers = async (
  conn: SQLExecutable,
  baseHandle: UserHandle,
  limit: number
) => {
  return await queryResults(
    conn,
    `
    SELECT id, name, handle 
    FROM user u 
    WHERE LOWER(u.handle) LIKE CONCAT(LOWER(:handle), '%') 
    ORDER BY u.handle ASC, u.creationDate ASC
    LIMIT :limit
    `,
    { handle: baseHandle.rawValue, limit }
  )
}
