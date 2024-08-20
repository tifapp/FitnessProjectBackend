import { UserHandle } from "TiFShared/domain-models/User.js"
import { MySQLExecutableDriver } from "../MySQLDriver/index.js"

export const userWithHandleDoesNotExist = (
  conn: MySQLExecutableDriver,
  handle: UserHandle
) =>
  conn
    .queryHasResults("SELECT TRUE FROM user WHERE handle = :handle", {
      handle
    })
    .inverted()
    .withFailure("duplicate-handle" as const)

export const userWithIdExists = (conn: MySQLExecutableDriver, id: string) =>
  conn.queryHasResults("SELECT TRUE FROM user WHERE id = :id", { id })
