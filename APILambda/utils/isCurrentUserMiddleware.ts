import { APIMiddleware, resp } from "TiFShared/api"
import { RouterParams } from "../router"

export const isCurrentUser: APIMiddleware<RouterParams> = async (
  input,
  next
) => {
  if (!input.params!.userId || input.context.selfId === input.params!.userId) {
    return resp(400, { error: "current-user" }) as never
  } else {
    return next(input)
  }
}
