import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { DatabaseUser, UserToUserRelation } from "./models.js"

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
          dbUser.themToYou === "blocked"
            ? res.status(403).json(dbUser)
            : res.status(200).json(dbUser)
        )
        .mapFailure((error) => res.status(404).json({ error }))
  )
}

export type DatabaseUserWithRelation = DatabaseUser & UserToUserRelation

export const userAndRelationsWithId = (
  conn: SQLExecutable,
  userId: string,
  fromUserId: string
) =>
  conn.queryFirstResult<DatabaseUserWithRelation>(
    `
      SELECT *, 
      ur1.status AS themToYou, 
      ur2.status AS youToThem 
      FROM user u 
      LEFT JOIN userRelations ur1 ON ur1.fromUserId = u.id
      AND ur1.fromUserId = :userId
      AND ur1.toUserId = :fromUserId
      LEFT JOIN userRelations ur2 ON ur2.toUserId = u.id
      AND ur2.fromUserId = :fromUserId
      AND ur2.toUserId = :userId
      WHERE u.id = :userId;
      `,
    { userId, fromUserId },
    { relations: ["themToYou", "youToThem"] }
  )
