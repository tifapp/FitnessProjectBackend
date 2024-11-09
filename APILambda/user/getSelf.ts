import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { resp } from "TiFShared/api/Transport"
import { authenticatedEndpoint } from "../router"

export const getSelf = authenticatedEndpoint<"getSelf">(
  ({ context: { selfId } }) =>
    conn
      .queryFirstResult<DBuser>("SELECT * FROM user WHERE id = :selfId", {
        selfId
      })
      .mapSuccess((user) => resp(200, user))
      .withFailure(resp(500, { error: "self-not-found" }) as never)
      .unwrap()
)
