import { MySQLExecutableDriver } from "../MySQLDriver/MySQLDriver.js"
import { DBuser } from "../entities.js"
import { ExtractSuccess } from "../result.js"
import { UserRelationship } from "./UserRelationships.js"

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

export type TiFUser = ExtractSuccess<ReturnType<typeof findTiFUser>> // TODO: Get type from shared package schema
