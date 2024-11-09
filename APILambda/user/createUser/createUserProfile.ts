import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { generateUniqueHandle } from "TiFBackendUtils/generateUserHandle"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension, endpoint } from "../../router"
import { v7 as uuidV7 } from "uuid"
import jwt from "jsonwebtoken"
import { envVars } from "TiFBackendUtils/env"

const checkValidName = (name: string) => {
  // TODO: add more conditions or use a zod schema
  if (name === "") {
    return failure("invalid-name" as const)
  }

  return success()
}

/**
 * Creates a new user in the database.
 *
 * @param conn see {@link MySQLExecutableDriver}
 * @param userDetails see {@link CreateUserDetails}
 */
export const insertUser = (
  conn: MySQLExecutableDriver,
  userDetails: Pick<DBuser, "handle" | "name">
) => {
  const id = uuidV7()
  return conn
    .executeResult(
      "INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)",
      { id, ...userDetails }
    )
    .withSuccess({ id, ...userDetails })
}

export const createCurrentUserProfile = endpoint<"createCurrentUserProfile">(
  async ({ body: { name } }) =>
    checkValidName(name)
      .flatMapSuccess(() => generateUniqueHandle(name))
      .flatMapSuccess((handle) => insertUser(conn, { handle, name }))
      .mapFailure((error) =>
        error === "invalid-name"
          ? (resp(400, { error }) as never)
          : (resp(500, { error }) as never)
      )
      .mapSuccess((result) =>
        resp(201, {
          ...result,
          token: jwt.sign(
            { ...result, handle: result.handle.rawValue },
            envVars.JWT_SECRET
          )
        })
      )
      .unwrap()
)
