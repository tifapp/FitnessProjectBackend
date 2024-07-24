import { conn, findTiFUser } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouter } from "../router"
import { userNotFoundBody } from "../utils/Responses"

export const getUser: TiFAPIRouter["getUser"] = ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
  findTiFUser(conn, { fromUserId, toUserId })
    .mapSuccess((user) =>
      user.relations.fromThemToYou === "blocked"
        ? resp(403, { error: "blocked", userId: toUserId })
        : resp(200, user)
    )
    .mapFailure(() => resp(404, userNotFoundBody(toUserId)))
    .unwrap()
