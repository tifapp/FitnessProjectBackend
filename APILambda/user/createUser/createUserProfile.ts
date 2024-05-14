import { DBuser, SQLExecutable, conn, failure, promiseResult, success } from "TiFBackendUtils"
import { CreateUserProfileEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { generateUniqueUsername } from "../generateUserHandle.js"

type NewUserDetails = {
  id: string
  name: string
  handle: string
}

const checkValidName = (name: string) => {
  if (name === "") {
    return failure("invalid-claims" as const)
  }

  return success()
}

const userWithHandleOrIdExists = (conn: SQLExecutable, { id, handle }: NewUserDetails) => {
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
 * @param conn see {@link SQLExecutable}
 * @param userDetails see {@link NewUserDetails}
 */
export const insertUser = (
  conn: SQLExecutable,
  userDetails: NewUserDetails
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
  userDetails: NewUserDetails
) =>
  conn.transaction((tx) =>
    userWithHandleOrIdExists(tx, userDetails)
      .flatMapSuccess(() => insertUser(tx, userDetails))
      .withSuccess(userDetails)
  )

export const createUserProfileRouter = (
  { setProfileCreatedAttribute }: CreateUserProfileEnvironment,
  router: ValidatedRouter
) =>
  router.postWithValidation("/", {}, (_, res) =>
    promiseResult(checkValidName(res.locals.name))
      .flatMapSuccess(() =>
        generateUniqueUsername(
          conn,
          res.locals.name
        )
      )
      .flatMapSuccess(handle => createUserProfileTransaction({ id: res.locals.selfId, name: res.locals.name, handle }))
      .flatMapSuccess(profile => setProfileCreatedAttribute(res.locals.selfId).withSuccess(profile))
      .mapFailure(error => res.status(error === "user-exists" ? 400 : 401).json({ error }))
      .mapSuccess(profile => res.status(201).json(profile))
  )
