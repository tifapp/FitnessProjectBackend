import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../../router"
import { generateUniqueHandle } from "../generateUserHandle"

type CreateUserInput = Pick<DBuser, "id" | "handle" | "name">

const checkValidName = (name: string) => {
  // TODO: add more conditions or use a zod schema
  if (name === "") {
    return failure("invalid-claims" as const)
  }

  return success()
}

const userWithHandleOrIdExists = (conn: MySQLExecutableDriver, { id, handle }: CreateUserInput) => {
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

export const createCurrentUserProfile: TiFAPIRouterExtension["createCurrentUserProfile"] = async ({ context: { selfId, name }, environment: { setProfileCreatedAttribute } }) =>
  checkValidName(name)
    .flatMapSuccess(() =>
      generateUniqueHandle(
        conn,
        name
      )
    )
    .flatMapSuccess(handle => createUserProfileTransaction({ id: selfId, name, handle }))
    .passthroughSuccess(() => setProfileCreatedAttribute(selfId))
    .mapFailure(error => error === "user-exists" ? resp(400, { error }) as never : resp(401, { error }) as never)
    .mapSuccess(profile => resp(201, profile))
    .unwrap()
