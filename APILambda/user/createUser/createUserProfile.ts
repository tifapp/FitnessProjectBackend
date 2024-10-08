import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { generateUniqueHandle } from "TiFBackendUtils/generateUserHandle"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../../router"

const checkValidName = (name: string) => {
  // TODO: add more conditions or use a zod schema
  if (name === "") {
    return failure("invalid-claims" as const)
  }

  return success()
}

const userWithHandleOrIdExists = (conn: MySQLExecutableDriver, { id, handle }: Pick<DBuser, "id" | "handle">) => {
  return (handle ? success() : failure("missing-handle" as const))
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
 * @param userDetails see {@link CreateUserDetails}
 */
export const insertUser = (
  conn: MySQLExecutableDriver,
  userDetails: Pick<DBuser, "id" | "handle" | "name">
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
  userDetails: Pick<DBuser, "id" | "handle" | "name">
) =>
  conn.transaction((tx) =>
    userWithHandleOrIdExists(tx, userDetails)
      .flatMapSuccess(() => insertUser(tx, userDetails))
      .withSuccess(userDetails)
  )

export const createCurrentUserProfile = (
  async ({ context: { selfId, name: cognitoName }, environment: { setProfileCreatedAttribute } }) =>
    checkValidName(cognitoName)
      .flatMapSuccess(() =>
        generateUniqueHandle(conn, cognitoName)
      )
      .flatMapSuccess(handle => createUserProfileTransaction({ id: selfId, handle, name: cognitoName }))
      .passthroughSuccess(() => setProfileCreatedAttribute(selfId))
      .mapFailure(error => error === "user-exists" ? resp(400, { error }) as never : resp(401, { error }) as never)
      .mapSuccess(({ id, handle }) => resp(201, { id, handle }))
      .unwrap()
) satisfies TiFAPIRouterExtension["createCurrentUserProfile"]
