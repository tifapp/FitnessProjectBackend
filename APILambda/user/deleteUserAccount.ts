import { conn } from "TiFBackendUtils"
import { userWithIdExists } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { authenticatedEndpoint } from "../router"

export const removeAccount = authenticatedEndpoint<"removeAccount">(
  ({ context: { selfId } }) =>
    userWithIdExists(conn, selfId)
      .mapSuccess(() => resp(204))
      .mapFailure(
        () =>
          resp(500, { userId: selfId, error: "self-does-not-exist" }) as never
      )
      .unwrap()
)
