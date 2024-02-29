import { SQLExecutable } from "TiFBackendUtils"

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
