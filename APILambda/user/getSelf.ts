import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouterExtension } from "../router"

export const getSelf = (
  ({ context: { selfId } }) =>
    conn
      .queryFirstResult<DBuser>("SELECT * FROM user WHERE id = :selfId", { selfId })
      .mapSuccess((user) => resp(200, user))
      .withFailure(resp(500, { error: "self-not-found" }) as never)
      .unwrap()
) satisfies TiFAPIRouterExtension["getSelf"]
