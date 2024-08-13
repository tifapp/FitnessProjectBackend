import { DBuser, MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { UserHandle } from "TiFShared/domain-models/User.js"
import { TiFAPIRouter } from "../router.js"

export const autocompleteUsers: TiFAPIRouter["autocompleteUsers"] = ({ query: { handle, limit } }) =>
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
