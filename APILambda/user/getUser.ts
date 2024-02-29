import { conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { UserAndRelationship, getUserAndRelationship } from "./TiFUser.js"

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
      getUserAndRelationship(conn, req.params.userId, res.locals.selfId)
        .mapSuccess((user) =>
          user.fromThemToYou === "blocked"
            ? res.status(403).json(blockedUserProfileResponse(user))
            : res.status(200).json(toUserWithRelationResponse(user))
        )
        .mapFailure((error) => res.status(404).json({ error }))
  )
}

const toUserWithRelationResponse = ({ fromThemToYou, fromYouToThem, ...rest }: UserAndRelationship) => ({
  ...rest,
  relations: {
    fromThemToYou,
    fromYouToThem
  }
})

const blockedUserProfileResponse = ({ name, profileImageURL, handle, fromYouToThem, fromThemToYou }: UserAndRelationship) => ({
  name,
  profileImageURL,
  handle,
  relations: {
    fromYouToThem,
    fromThemToYou
  }
})
