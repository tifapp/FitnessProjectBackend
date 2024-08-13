import { conn, userWithIdExists } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { TiFAPIRouter } from "../router.js"

export const removeAccount: TiFAPIRouter["removeAccount"] = ({ context: { selfId } }) =>
  userWithIdExists(conn, selfId)
    .mapSuccess(() => resp(204))
    .mapFailure(() => resp(500, { userId: selfId, error: "self-does-not-exist" }) as never)
    .unwrap()
