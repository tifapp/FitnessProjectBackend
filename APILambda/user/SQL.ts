import { SQLExecutable } from "TiFBackendUtils"
import { DatabaseUser } from "./models.js"

export type RegisterUserRequest = {
  id: string
  name: string
  handle: string
}

export const userWithHandleDoesNotExist = (
  conn: SQLExecutable,
  handle: string
) =>
  conn
    .queryHasResults("SELECT TRUE FROM user WHERE handle = :handle", {
      handle
    })
    .inverted()
    .withFailure("duplicate-handle" as const)

export const userWithIdExists = (conn: SQLExecutable, id: string) =>
  conn.queryHasResults("SELECT TRUE FROM user WHERE id = :id", { id })

/**
 * Queries the user with the given id.
 */
export const userWithId = (conn: SQLExecutable, userId: string) =>
  conn
    .queryFirstResult<DatabaseUser>("SELECT * FROM user WHERE id = :userId", {
      userId
    })
    .withFailure("user-not-found" as const)
