import { conn, findTiFUser } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { TiFAPIRouter } from "../router.js"
import { userNotFoundBody } from "../utils/Responses.js"

export const getUser: TiFAPIRouter["getUser"] = ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
  findTiFUser(conn, { fromUserId, toUserId })
    .mapSuccess((user) =>
      user.relations.fromThemToYou === "blocked"
        ? resp(403, { error: "blocked", userId: toUserId })
        : resp(200, user)
    )
    .mapFailure(() => resp(404, userNotFoundBody(toUserId)))
    .unwrap()
