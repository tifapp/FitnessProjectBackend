import { conn } from "TiFBackendUtils"
import { findTiFUser } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouterExtension } from "../router"
import { userNotFoundBody } from "../utils/Responses"

export const getUser = (({
  context: { selfId: fromUserId },
  params: { userId: toUserId }
}) =>
  findTiFUser(conn, { fromUserId, toUserId })
    .mapFailure((result) =>
      result === "no-results"
        ? resp(404, userNotFoundBody(toUserId))
        : resp(403, { error: "blocked-you", userId: toUserId })
    )
    .mapSuccess((user) => resp(200, user))
    .unwrap()) satisfies TiFAPIRouterExtension["getUser"]
