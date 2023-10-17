/* eslint-disable import/extensions */ // todo: allow ts imports here
import dotenv from "dotenv"
import { createCognitoAuthToken } from "./createCognitoUsers"
import { testApp } from "./test/testApp"
import { createMockAuthToken } from "./test/testUsers"

dotenv.config()

export default async (): Promise<void> => {
  if (process.env.TEST_ENV === "staging") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore process.env will be undefined and mock app will be created if excluded from the setup file
    global.testApp = testApp
    global.registerUser = createCognitoAuthToken
    global.defaultUser = await createCognitoAuthToken()
    global.defaultUser2 = await createCognitoAuthToken()
  } else {
    global.registerUser = createMockAuthToken
    global.defaultUser = await createMockAuthToken()
    global.defaultUser2 = await createMockAuthToken()
  }
}
