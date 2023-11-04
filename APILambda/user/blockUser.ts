import { conn } from "TiFBackendUtils"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import { userWithIdExists } from "./SQL.js"
import { z } from "zod"

const BlockUserRequestSchema = z.object({
  userId: z.string().uuid()
})

export const createBlockUserRouter = (router: ValidatedRouter) => {
  router.patchWithValidation(
    "/block/:userId",
    { pathParamsSchema: BlockUserRequestSchema },
    async (req, res) => {
      return userWithIdExists(conn, req.params.userId)
        .mapSuccess(() => res.status(204).send())
        .mapFailure(() => userNotFoundResponse(res, req.params.userId))
    }
  )
}
