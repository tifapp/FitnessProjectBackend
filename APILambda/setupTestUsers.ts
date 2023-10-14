/* eslint-disable import/extensions */ // todo: allow ts imports here
import { createCognitoAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./test/testUsers"

export default async (): Promise<void> => {
  if (process.env.NODE_ENV === "staging") {
    global.registerUser = createCognitoAuthToken
    global.defaultUser = await createCognitoAuthToken()
    global.defaultUser2 = await createCognitoAuthToken()
  } else {
    global.registerUser = createMockAuthToken
    global.defaultUser = await createMockAuthToken()
    global.defaultUser2 = await createMockAuthToken()
  }
}
