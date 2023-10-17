/* eslint-disable import/extensions */ // todo: allow ts imports here
import dotenv from "dotenv"
import { createCognitoAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./test/testUsers"

dotenv.config()

export default async (): Promise<void> => {
  if (process.env.TEST_ENV === "staging") {
    global.registerUser = createCognitoAuthToken
    global.defaultUser = await createCognitoAuthToken()
    global.defaultUser2 = await createCognitoAuthToken()
  } else {
    global.registerUser = createMockAuthToken
    global.defaultUser = await createMockAuthToken()
    global.defaultUser2 = await createMockAuthToken()
  }
}
