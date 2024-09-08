import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/index"
import { TiFAPIRouter } from "../router"

const getSelfSQL = (conn: MySQLExecutableDriver, userId: string) =>
  conn
    .queryFirstResult<DBuser>("SELECT * FROM user WHERE id = :userId", {
      userId
    })
    .withFailure("self-not-found" as const)

export const getSelf: TiFAPIRouter["getSelf"] = ({ context: { selfId } }) =>
  getSelfSQL(conn, selfId)
    .mapSuccess((user) => resp(200, user))
    .mapFailure((error) => resp(500, { error }) as never)
    .unwrap()
