import { ExtractSuccess, failure, success } from "TiFShared/lib/Result"
import { DBuser } from "../DBTypes"
import { MySQLExecutableDriver } from "../MySQLDriver/index"
import {
  UserRelations,
  UserRelationshipPair,
  UserRelationsSchema
} from "./UserRelationships"

const FIND_USER_SQL = `
  CASE WHEN :fromUserId = :toUserId
    THEN 'current-user'
    ELSE COALESCE(fromThemToYou.status, 'not-friends')
  END AS fromThemToYou,
  CASE WHEN :fromUserId = :toUserId
    THEN 'current-user'
    ELSE COALESCE(fromYouToThem.status, 'not-friends')
  END AS fromYouToThem
FROM
    user theirUser
    LEFT JOIN userRelationships fromThemToYou ON fromThemToYou.fromUserId = theirUser.id AND fromThemToYou.toUserId = :fromUserId
    LEFT JOIN userRelationships fromYouToThem ON fromYouToThem.fromUserId = :fromUserId AND fromYouToThem.toUserId = theirUser.id
WHERE theirUser.id = :toUserId;`

export const userRelations = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn
    .queryFirstResult<DBuser & UserRelations>(
      `
      SELECT
        ${FIND_USER_SQL}
      `,
      { fromUserId, toUserId }
    )
    .flatMapSuccess(({ fromThemToYou, fromYouToThem }) => {
      return userRelationsStatus(fromThemToYou, fromYouToThem)
    })

export const findTiFUser = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn
    .queryFirstResult<DBuser & UserRelations>(
      `
      SELECT
        theirUser.*,
        ${FIND_USER_SQL}
      `,
      { fromUserId, toUserId }
    )
    .flatMapSuccess(({ fromThemToYou, fromYouToThem, ...user }) => {
      return userRelationsStatus(fromThemToYou, fromYouToThem)
        .mapSuccess((relationStatus) => ({ ...user, relationStatus }))
        .mapFailure((relationStatus) => ({ ...user, relationStatus }))
    })

const userRelationsStatus = (fromThemToYou: string, fromYouToThem: string) => {
  const relationStatus = UserRelationsSchema.parse({
    fromThemToYou,
    fromYouToThem
  })
  return relationStatus === "blocked-you"
    ? failure(relationStatus)
    : success(relationStatus)
}

export type TiFUser = ExtractSuccess<ReturnType<typeof findTiFUser>>
