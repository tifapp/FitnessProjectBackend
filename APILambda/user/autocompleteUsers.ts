import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { UserHandle } from "TiFShared/domain-models/User"
import { TiFAPIRouterExtension } from "../router"

export const autocompleteUsers: TiFAPIRouterExtension["autocompleteUsers"] = ({ query: { handle, limit } }) =>
  autocompleteUsersSQL(
    conn,
    handle,
    limit
  )
    .mapSuccess(users => resp(200, { users }))
    .unwrap()

const autocompleteUsersSQL = (
  conn: MySQLExecutableDriver,
  handle: UserHandle,
  limit: number
) => conn.queryResult<Pick<DBuser, "id" | "name" | "handle">>(
  `
    SELECT id, name, handle 
    FROM user u 
    WHERE LOWER(u.handle) LIKE CONCAT(LOWER(:handle), '%') 
    ORDER BY u.handle ASC, u.createdDateTime ASC
    LIMIT :limit
    `,
  { handle, limit }
)
