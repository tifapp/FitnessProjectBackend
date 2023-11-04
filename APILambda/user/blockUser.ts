import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"

export const createBlockUserRouter = (router: ValidatedRouter) => {
  router.patch("/block/:userId", async (req, res) => {
    return userNotFoundResponse(res, req.params.userId)
  })
}
