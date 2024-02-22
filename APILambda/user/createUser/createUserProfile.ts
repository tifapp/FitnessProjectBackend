import { SQLExecutable, conn, failure, promiseResult, success } from "TiFBackendUtils"
import { CreateUserProfileEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { RegisterUserRequest } from "../SQL.js"
import { generateUniqueUsername } from "../generateUserHandle.js"
import { DatabaseUser } from "../models.js"

const checkValidName = (name: string, id: string) => {
  if (name === "") {
    return failure("invalid-claims" as const)
  }

  return success({
    id,
    name
  })
}

const userWithHandleOrIdExists = (conn: SQLExecutable, id: string, handle?: string) => {
  return promiseResult(handle ? success() : failure("missing-handle" as const))
    .flatMapSuccess(() => conn
      .queryFirstResult<DatabaseUser>("SELECT TRUE FROM user WHERE handle = :handle OR id = :id", {
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
 * @param request see {@link RegisterUserRequest}
 */
export const insertUser = (
  conn: SQLExecutable,
  request: RegisterUserRequest
) => conn.queryResults(
  "INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)",
  request
)

/**
 * Attempts to register a new user in the database.
 *
 * @param conn the query executor to use
 * @param request the initial fields required to create a user
 * @returns an object containing the id of the newly registered user
 */
const createUserProfileTransaction = (
  request: RegisterUserRequest
) =>
  conn.transaction((tx) =>
    userWithHandleOrIdExists(tx, request.id, request.handle)
      .flatMapSuccess(() => insertUser(tx, request)).mapSuccess(() => ({ id: request.id, handle: request.handle }))
  )

export const createUserProfileRouter = (
  { setProfileCreatedAttribute }: CreateUserProfileEnvironment,
  router: ValidatedRouter
) =>
  router.postWithValidation("/", {}, (_, res) =>
    promiseResult(checkValidName(res.locals.name, res.locals.selfId))
      .flatMapSuccess(registerReq =>
        generateUniqueUsername(
          conn,
          registerReq.name
        )
          .mapSuccess(handle => Object.assign(registerReq, { handle })))
      .flatMapSuccess(profile => createUserProfileTransaction(profile))
      .flatMapSuccess(profile => setProfileCreatedAttribute(res.locals.selfId).mapSuccess(() => profile))
      .mapFailure(error => res.status(error === "user-exists" ? 400 : 401).json({ error }))
      .mapSuccess(profile => res.status(201).json(profile))
  )
