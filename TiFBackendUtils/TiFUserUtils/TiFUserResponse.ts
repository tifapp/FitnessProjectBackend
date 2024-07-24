import { BidirectionalUserRelations } from "TiFShared/domain-models/User"
import { ExtractSuccess } from "TiFShared/lib/Result"
import { DBuser } from "../DBTypes"
import { MySQLExecutableDriver } from "../MySQLDriver/index"
import { UserRelationsInput } from "./UserRelationships"

export const findTiFUser = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationsInput
) =>
  conn
    .queryFirstResult<DBuser & BidirectionalUserRelations>(
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
          LEFT JOIN userRelations fromThemToYou ON fromThemToYou.fromUserId = theirUser.id AND fromThemToYou.toUserId = :fromUserId
          LEFT JOIN userRelations fromYouToThem ON fromYouToThem.fromUserId = :fromUserId AND fromYouToThem.toUserId = theirUser.id
      WHERE theirUser.id = :toUserId;
      `,
      { fromUserId, toUserId }
    )
    .mapSuccess(({ fromThemToYou, fromYouToThem, ...user }) => ({ ...user, relations: { fromThemToYou, fromYouToThem } }))

export type TiFUser = ExtractSuccess<ReturnType<typeof findTiFUser>>
