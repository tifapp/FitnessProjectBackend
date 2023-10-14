/* eslint-disable import/extensions */ // todo: allow ts imports here
import { createCognitoAuthToken, createCognitoUsers } from "./createCognitoUsers"
import { createMockAuthToken, createMockUsers } from "./test/testUsers"

export default async (): Promise<void> => {
  if (process.env.NODE_ENV === "staging") {
    // use global variable to initialize the test users once and make available for all tests
    global.testUsers = await createCognitoUsers(10)
    global.createAuthToken = createMockAuthToken
  } else {
    global.testUsers = createMockUsers(10)
    global.createAuthToken = createCognitoAuthToken
  }
}
