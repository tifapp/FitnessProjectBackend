import { conn } from "TiFBackendUtils"
import { userWithIdExists } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouter } from "../router"

export const removeAccount: TiFAPIRouter["removeAccount"] = ({ context: { selfId } }) =>
  userWithIdExists(conn, selfId)
    .mapSuccess(() => resp(204))
    .mapFailure(() => resp(500, { userId: selfId, error: "self-does-not-exist" }) as never)
    .unwrap()
