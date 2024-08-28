import { ExtractSuccess } from "TiFShared/lib/Result"
import { MySQLExecutableDriver } from "../MySQLDriver/index"
import { DBuser } from "../entities"
import { UserRelationship } from "./UserRelationships"

export const findTiFUser = (
  conn: MySQLExecutableDriver,
  yourId: string,
  theirId: string
) =>
  conn
    .queryFirstResult<DBuser & UserRelationship>(
      `
      SELECT
      theirUser.*,
          COALESCE(fromThemToYou.status, 'not-friends') AS fromThemToYou,
          COALESCE(fromYouToThem.status, 'not-friends') AS fromYouToThem
      FROM
          user theirUser
          LEFT JOIN userRelations fromThemToYou ON fromThemToYou.fromUserId = theirUser.id AND fromThemToYou.toUserId = :yourId
          LEFT JOIN userRelations fromYouToThem ON fromYouToThem.fromUserId = :yourId AND fromYouToThem.toUserId = theirUser.id
      WHERE theirUser.id = :theirId;
      `,
      { yourId, theirId }
    )
    .mapSuccess(({ fromThemToYou, fromYouToThem, ...user }) => ({ ...user, relations: { fromThemToYou, fromYouToThem } }))

export type TiFUser = ExtractSuccess<ReturnType<typeof findTiFUser>>;
