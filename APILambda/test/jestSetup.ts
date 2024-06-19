/* eslint-disable import/extensions */ // todo: allow ts imports here
import { TestUser, TestUserInput } from "../global"
import { createCognitoTestAuthToken } from "./createCognitoUsers"
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

  if (!testEnvVars.API_ENDPOINT) {
    await setGlobalVariables({ createUser: createMockAuthToken, maxUsers: 5 })
  } else { 
    await setGlobalVariables({ createUser: createCognitoTestAuthToken, maxUsers: 5 })
    // await setGlobalVariables({ createUser: createCognitoAuthToken, maxUsers: 5 })
    // TODO: Remove createCognitoTestAuthToken after we get company email so we can have unlimited test users
  }
}
