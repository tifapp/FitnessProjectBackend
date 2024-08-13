import { DBuser, MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { UserHandle } from "TiFShared/domain-models/User.js"
import { failure, promiseResult, success } from "TiFShared/lib/Result.js"
import { TiFAPIRouter } from "../../router.js"
import { generateUniqueUsername } from "../generateUserHandle.js"
import { setProfileCreatedAttribute } from "./setCognitoAttribute.js"

type CreateUserInput = Pick<DBuser, "id" | "handle" | "name">

const checkValidName = (name: string) => {
  if (name === "") {
    return failure("invalid-claims" as const)
  }

  return success()
}

const userWithHandleOrIdExists = (conn: MySQLExecutableDriver, { id, handle }: CreateUserInput) => {
  return promiseResult(handle ? success() : failure("missing-handle" as const))
    .flatMapSuccess(() => conn
      .queryFirstResult<DBuser>("SELECT TRUE FROM user WHERE handle = :handle OR id = :id", {
        handle,
        id
      })
      .inverted()
      .mapFailure(user => user.handle === handle ? "duplicate-handle" as const : "user-exists")
    )
}

/**
 * Creates a new user in the database.
 *
 * @param conn see {@link MySQLExecutableDriver}
 * @param userDetails see {@link CreateUserInput}
 */
export const insertUser = (
  conn: MySQLExecutableDriver,
  userDetails: CreateUserInput
) => conn.executeResult(
  "INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)",
  userDetails
)

/**
 * Attempts to register a new user in the database.
 *
 * @param conn the query executor to use
 * @param userDetails the initial fields required to create a user
 * @returns an object containing the id of the newly registered user
 */
const createUserProfileTransaction = (
  userDetails: CreateUserInput
) =>
  conn.transaction((tx) =>
    userWithHandleOrIdExists(tx, userDetails)
      .flatMapSuccess(() => insertUser(tx, userDetails))
      .withSuccess(userDetails)
  )

export const createCurrentUserProfile: TiFAPIRouter["createCurrentUserProfile"] = ({ context: { selfId, name } }) =>
  promiseResult(checkValidName(name))
    .flatMapSuccess(() =>
      generateUniqueUsername(
        conn,
        name
      )
    )
    .flatMapSuccess(handle => createUserProfileTransaction({ id: selfId, name, handle: UserHandle.parse(handle).handle! }))
    .flatMapSuccess(profile => setProfileCreatedAttribute(selfId).withSuccess(profile))
    .mapFailure(error => error === "user-exists" ? resp(400, { error }) as never : resp(401, { error }) as never)
    .mapSuccess(profile => resp(201, profile))
    .unwrap()
