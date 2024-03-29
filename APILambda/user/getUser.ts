import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { DatabaseUser, UserToProfileRelationStatus } from "./models.js"

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
      userAndRelationsWithId(conn, req.params.userId, res.locals.selfId)
        .mapSuccess((dbUser) =>
          dbUser.themToYouStatus === "blocked"
            ? res.status(403).json(blockedUserProfileResponse(dbUser))
            : res.status(200).json(toUserWithRelationResponse(dbUser))
        )
        .mapFailure((error) => res.status(404).json({ error }))
  )
}

export type DatabaseUserWithRelation = DatabaseUser & {
  themToYouStatus: UserToProfileRelationStatus | null
  youToThemStatus: UserToProfileRelationStatus | null
}

const toUserWithRelationResponse = (user: DatabaseUserWithRelation) => ({
  id: user.id,
  bio: user.bio,
  creationDate: user.creationDate,
  handle: user.handle,
  name: user.name,
  profileImageURL: user.profileImageURL,
  updatedAt: user.updatedAt,
  relations: {
    themToYou: user.themToYouStatus,
    youToThem: user.youToThemStatus
  }
})

const blockedUserProfileResponse = (user: DatabaseUserWithRelation) => ({
  name: user.name,
  profileImageURL: user.profileImageURL,
  handle: user.handle,
  relations: {
    youToThem: user.youToThemStatus,
    themToYou: user.themToYouStatus
  }
})

export const userAndRelationsWithId = (
  conn: SQLExecutable,
  userId: string,
  fromUserId: string
) =>
  conn.queryFirstResult<DatabaseUserWithRelation>(
    `
      SELECT *, 
      ur1.status AS themToYouStatus, 
      ur2.status AS youToThemStatus 
      FROM user u 
      LEFT JOIN userRelations ur1 ON ur1.fromUserId = u.id
      AND ur1.fromUserId = :userId
      AND ur1.toUserId = :fromUserId
      LEFT JOIN userRelations ur2 ON ur2.toUserId = u.id
      AND ur2.fromUserId = :fromUserId
      AND ur2.toUserId = :userId
      WHERE u.id = :userId;
      `,
    { userId, fromUserId }
  )
