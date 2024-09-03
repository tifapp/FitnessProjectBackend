import { conn } from "TiFBackendUtils"
import { TiFUser, findTiFUser } from "TiFBackendUtils/TiFUserUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env"
import { ValidatedRouter } from "../validation"

const userIdSchema = z.object({
  userId: z.string()
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getUserRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * gets the user with the specified userId
   */
  router.getWithValidation(
    "/:userId",
    { pathParamsSchema: userIdSchema },
    (req, res) =>
      findTiFUser(conn, res.locals.selfId, req.params.userId)
        .mapSuccess((user) =>
          user.relations.fromThemToYou === "blocked"
            ? res.status(403).json(blockedUserProfileResponse(user))
            : res.status(200).json(user)
        )
        .mapFailure((error) => res.status(404).json({ error }))
  )
}

const blockedUserProfileResponse = ({ name, profileImageURL, handle, relations }: TiFUser) => ({
  name,
  profileImageURL,
  handle,
  relations
})
