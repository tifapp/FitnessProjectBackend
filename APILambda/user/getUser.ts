import { conn } from "TiFBackendUtils"
import { findTiFUser } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouterExtension } from "../router"
import { userNotFoundBody } from "../utils/Responses"

export const getUser: TiFAPIRouterExtension["getUser"] = ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
  findTiFUser(conn, { fromUserId, toUserId })
    .mapSuccess((user) =>
      user.relations.fromThemToYou === "blocked"
        ? resp(403, { error: "blocked", userId: toUserId })
        : resp(200, user)
    )
    .mapFailure(() => resp(404, userNotFoundBody(toUserId)))
    .unwrap()
