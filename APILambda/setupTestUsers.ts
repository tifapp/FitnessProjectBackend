/* eslint-disable import/extensions */ // todo: allow ts imports here
import dotenv from "dotenv"
import { createCognitoAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./test/testUsers"

dotenv.config()

export default async (): Promise<void> => {
  if (process.env.TEST_ENV === "staging") {
    global.registerUser = createCognitoAuthToken
    global.unregisteredUser = await createCognitoAuthToken({ profileExists: true })
    global.defaultUser = await createCognitoAuthToken({ profileExists: false })
    global.defaultUser2 = await createCognitoAuthToken({ profileExists: false })
  } else {
    global.registerUser = createMockAuthToken
    global.unregisteredUser = await createMockAuthToken({ profileExists: true })
    global.defaultUser = await createMockAuthToken({ profileExists: false })
    global.defaultUser2 = await createMockAuthToken({ profileExists: false })
  }
}
