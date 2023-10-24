import { SQLExecutable, conn, failure, promiseResult, success } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { RegisterUserRequest, userWithHandleExists, userWithIdExists } from "./SQL.js"
import { generateUniqueUsername } from "./generateUserHandle.js"

const checkValidName = (name: string, id: string) => {
  if (name === "") {
    return failure("invalid-claims" as const)
  }

  return success({
    id,
    name
  })
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
export const createUserProfileTransaction = (
  conn: SQLExecutable,
  request: RegisterUserRequest
) =>
  userWithIdExists(conn, request.id).withFailure("user-already-exists")
    .withSuccess(userWithHandleExists(conn, request.handle)).withFailure("duplicate-handle")
    .withSuccess(insertUser(conn, request)).withSuccess({ id: request.id, handle: request.handle })

export const createUserProfileRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) =>
  router.postWithValidation("/", {}, (_, res) =>
    promiseResult(checkValidName(res.locals.name, res.locals.selfId))
      .flatMapSuccess(registerReq =>
        generateUniqueUsername(
          conn,
          registerReq.name
        )
          .flatMapSuccess(handle => promiseResult(success(Object.assign(registerReq, { handle })))))
      .flatMapSuccess(profile => conn.transaction((tx) => createUserProfileTransaction(tx, profile)))
      .mapFailure(error => res.status(401).json({ error }))
      .mapSuccess(result => res.status(201).json(result))
  )
