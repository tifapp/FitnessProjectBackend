import { ExtractSuccess, failure, success } from "TiFShared/lib/Result"
import { DBuser } from "../DBTypes"
import { MySQLExecutableDriver } from "../MySQLDriver/index"
import { UserRelations, UserRelationshipPair, UserRelationsSchema } from "./UserRelationships"

export const findTiFUser = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn
    .queryFirstResult<DBuser & UserRelations>(
      `
      SELECT
      theirUser.*,
          CASE
            WHEN :fromUserId = :toUserId THEN 'current-user'
            ELSE COALESCE(fromThemToYou.status, 'not-friends')
          END AS fromThemToYou,
          CASE
            WHEN :fromUserId = :toUserId THEN 'current-user'
            ELSE COALESCE(fromYouToThem.status, 'not-friends')
          END AS fromYouToThem
      FROM
          user theirUser
          LEFT JOIN userRelationships fromThemToYou ON fromThemToYou.fromUserId = theirUser.id AND fromThemToYou.toUserId = :fromUserId
          LEFT JOIN userRelationships fromYouToThem ON fromYouToThem.fromUserId = :fromUserId AND fromYouToThem.toUserId = theirUser.id
      WHERE theirUser.id = :toUserId;
      `,
      { fromUserId, toUserId }
    )
    .flatMapSuccess(({ fromThemToYou, fromYouToThem, ...user }) => {
      const relationStatus = UserRelationsSchema.parse({ fromThemToYou, fromYouToThem })

      if (relationStatus === "blocked-you") {
        return failure({ ...user, relationStatus })
      } else {
        return success({ ...user, relationStatus })
      }
    })

export type TiFUser = ExtractSuccess<ReturnType<typeof findTiFUser>>
