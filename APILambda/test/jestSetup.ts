/* eslint-disable import/extensions */ // todo: allow ts imports here
import dotenv from "dotenv"
import { createCognitoAuthToken } from "./createCognitoUsers"
import { createMockAuthToken } from "./createMockUsers"

dotenv.config()

export default async (): Promise<void> => {
  process.env.TZ = "UTC"

  if (process.env.TEST_ENV === "staging") {
    global.registerUser = createCognitoAuthToken
    global.unregisteredUser = await createCognitoAuthToken({ profileExists: true })
    const user1 = await createCognitoAuthToken({ profileExists: false })
    const user2 = await createCognitoAuthToken({ profileExists: false })
    const user3 = await createCognitoAuthToken({ profileExists: false })
    global.users = [user1, user2, user3]
  } else {
    global.registerUser = createMockAuthToken
    global.unregisteredUser = await createMockAuthToken({ profileExists: true })
    const user1 = await createMockAuthToken({ profileExists: false })
    const user2 = await createMockAuthToken({ profileExists: false })
    const user3 = await createMockAuthToken({ profileExists: false })
    global.users = [user1, user2, user3]
  }
}
