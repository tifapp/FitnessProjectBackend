import {
  DBuserSettings,
  SQLExecutable,
  success,
  userWithIdExists
} from "TiFBackendUtils"
import { DEFAULT_USER_SETTINGS, UserSettings } from "./models.js"

/**
 * Queries a given user's settings. If the user has never edited their settings,
 * undefined will be returned if no errors occur.
 *
 * @param conn the query executor to use
 * @param id the id of the user
 * @returns a result that indicates that the user is not found, or their current settings
 */
export const queryUserSettings = (conn: SQLExecutable, userId: string) =>
  userWithIdExists(conn, userId)
    .flatMapSuccess(() =>
      conn.queryFirstResult<UserSettings>(
        `
    SELECT *
    FROM userSettings
    WHERE userId = :userId
  `,
        { userId }
      )
    )
    .flatMapFailure(() => success(DEFAULT_USER_SETTINGS))
