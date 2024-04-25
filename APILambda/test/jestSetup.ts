/* eslint-disable import/extensions */ // todo: allow ts imports here
import { TestUser, TestUserInput } from "../global"
import { createCognitoAuthToken, createCognitoTestAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./createMockUsers"
import { testEnvVars } from "./testEnv"

// const createUserTableSQL = `
// CREATE TABLE IF NOT EXITS user (
// id char(36) NOT NULL,
// name varchar(50) NOT NULL,
// handle varchar(15) NOT NULL,
// createdDateTime datetime NOT NULL DEFAULT current_timestamp(),
// updatedDateTime datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
// bio varchar(500),
// profileImageURL varchar(200),
// PRIMARY KEY (id),
// UNIQUE KEY handle (handle),
// CONSTRAINT format_user_handle CHECK (REGEXP_LIKE(handle, _utf8mb4 '^[a-z_0-9]{1,15}$'))
// )`

// const createTableSQL = `CREATE TABLE IF NOT EXISTS event (
// id bigint NOT NULL AUTO_INCREMENT,
// description varchar(1000) NOT NULL,
// startDateTime datetime NOT NULL,
// endDateTime datetime NOT NULL,
// hostId char(36) NOT NULL,
// color varchar(9) NOT NULL,
// title varchar(100) NOT NULL,
// shouldHideAfterStartDate tinyint(1) NOT NULL,
// isChatEnabled tinyint(1) NOT NULL,
// latitude decimal(10,7) NOT NULL,
// longitude decimal(10,7) NOT NULL,
// createdDateTime datetime NOT NULL DEFAULT current_timestamp(),
// updatedDateTime datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
// endedDateTime datetime,
// PRIMARY KEY (id),
// UNIQUE KEY unique_event_id (id),
// KEY event_host_must_exist (hostId),
// KEY idx_startDateTime (startDateTime),
// CONSTRAINT event_host_must_exist FOREIGN KEY (hostId) REFERENCES user (id),
// CONSTRAINT event_must_end_after_start CHECK (startDateTime < endDateTime),
// CONSTRAINT format_event_color CHECK (REGEXP_LIKE(color, _utf8mb4 '^#[0-9A-Fa-f]{6}$'))
// )`

const setGlobalVariables = async ({ createUser, maxUsers }: {createUser: (user?: TestUserInput) => Promise<TestUser>, maxUsers: number}) => {
  global.registerUser = createUser
  global.unregisteredUser = await createUser({ profileExists: true })
  global.users = await Promise.all(Array.from({ length: maxUsers }, () =>
    createUser({ profileExists: false })
  ))
}

// eslint-disable-next-line camelcase
// const recreate_tables = async () => {
//   await conn.transaction(async (tx) => {
//     return tx.queryResult("SELECT * FROM user")
//     // await Promise.allSettled([
//     //   tx.queryResult("DROP TABLE IF EXISTS `EventAttendeeCountView`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `EventAttendeesView`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `TifEventView`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `banned`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `eventAttendance`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `eventReports`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `location`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `pushTokens`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `userArrivals`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `userRelations`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `userReports`;"),
//     //   tx.queryResult("DROP TABLE IF EXISTS `userSettings`;")
//     // ])
//     // await tx.queryResult("DROP TABLE IF EXISTS `event`;")
//     // await tx.queryResult("DROP TABLE IF EXISTS `user`;")
//     // return tx.queryResult(createUserTableSQL)
//   })
// }

export default async (): Promise<void> => {
  process.env.TZ = "UTC"

  if (testEnvVars.API_ENDPOINT?.endsWith("dev")) { // TODO: Remove after we get company email so we can have unlimited test users
    await setGlobalVariables({ createUser: createCognitoTestAuthToken, maxUsers: 5 })
  } else if (testEnvVars.API_ENDPOINT?.endsWith("staging")) {
    await setGlobalVariables({ createUser: createCognitoAuthToken, maxUsers: 5 })
  } else {
    await setGlobalVariables({ createUser: createMockAuthToken, maxUsers: 5 })
  }
}
