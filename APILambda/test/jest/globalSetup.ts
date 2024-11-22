import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { TestUser, TestUserInput } from "../../global"
import { createMockAuthToken } from "../createMockUsers"

const setGlobalVariables = async ({
  createUser,
  maxUsers
}: {
  createUser: (user?: TestUserInput) => Promise<TestUser>
  maxUsers: number
}) => {
  global.registerUser = createUser
  global.unregisteredUser = await createUser({ profileExists: true })
  global.users = await Promise.all(
    Array.from({ length: maxUsers }, () => createUser({ profileExists: false }))
  )
}

export default async (): Promise<void> => {
  process.env.TZ = "UTC"
  addLogHandler(consoleLogHandler())
  await setGlobalVariables({ createUser: createMockAuthToken, maxUsers: 15 })
}
