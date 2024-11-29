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
  global.users = await Promise.all(
    Array.from({ length: maxUsers }, () => createUser())
  )
}

export default async (): Promise<void> => {
  process.env.TZ = "UTC"
  await setGlobalVariables({ createUser: createMockAuthToken, maxUsers: 15 })
}
