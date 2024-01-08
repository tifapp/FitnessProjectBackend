/* eslint-disable import/extensions */ // todo: allow ts imports here
import dotenv from "dotenv"
import { TestUser, TestUserInput } from "../global"
import { createCognitoAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./createMockUsers"

dotenv.config()

const setGlobalVariables = async ({ createUser, maxUsers }: {createUser: (user?: TestUserInput) => Promise<TestUser>, maxUsers: number}) => {
  global.registerUser = createUser
  global.unregisteredUser = await createUser({ profileExists: true })
  global.users = await Promise.all(Array.from({ length: maxUsers }, () =>
    createUser({ profileExists: false })
  ))
}

export default async (): Promise<void> => {
  process.env.TZ = "UTC"

  if (process.env.TEST_ENV === "staging") {
    setGlobalVariables({ createUser: createCognitoAuthToken, maxUsers: 10 })
  } else {
    setGlobalVariables({ createUser: createMockAuthToken, maxUsers: 10 })
  }
}
