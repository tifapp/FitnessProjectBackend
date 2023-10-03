/* eslint-disable import/extensions */ // todo: allow ts imports here
import { createCognitoUsers } from "./createCognitoUsers"
import { createMockUsers } from "./test/testUsers"

export default async (): Promise<void> => {
  if (process.env.NODE_ENV === "staging") {
    // use global variable to initialize the test users once and make available for all tests
    global.testUsers = await createCognitoUsers(10)
  } else {
    global.testUsers = createMockUsers(10)
  }
}
