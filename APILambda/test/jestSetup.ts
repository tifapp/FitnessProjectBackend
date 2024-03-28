/* eslint-disable import/extensions */ // todo: allow ts imports here
import { TestUser, TestUserInput } from "../global"
import { createCognitoAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./createMockUsers"
import { testEnvVars } from "./testEnv"

const setGlobalVariables = async ({ createUser, maxUsers }: {createUser: (user?: TestUserInput) => Promise<TestUser>, maxUsers: number}) => {
  global.registerUser = createUser
  global.unregisteredUser = await createUser({ profileExists: true })
  global.users = await Promise.all(Array.from({ length: maxUsers }, () =>
    createUser({ profileExists: false })
  ))
}

export default async (): Promise<void> => {
  process.env.TZ = "UTC"

  // add another stage?
  if (testEnvVars.TEST_ENV === "staging_tests") {
    // clear cognito user pool IF NOT dev-to-staging test
    await setGlobalVariables({ createUser: createCognitoAuthToken, maxUsers: 5 }) // instead of creating users, check for existing users in the user pool
  } else {
    await setGlobalVariables({ createUser: createMockAuthToken, maxUsers: 5 })
  }
}
