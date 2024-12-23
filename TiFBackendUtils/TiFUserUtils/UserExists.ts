import { UserHandle } from "TiFShared/domain-models/User"
import { MySQLExecutableDriver } from "../MySQLDriver/index"

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
