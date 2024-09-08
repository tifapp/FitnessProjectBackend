import { UserHandle } from "TiFShared/domain-models/User";
import { testAPI } from "../testApp";

export type TestUser = {handle: UserHandle, id: string, auth: string, name: string};

export const testUserCounter = { currentUserIndex: 0 }

// database is reset for each test so we need to create a new auth for each test
export const createUserFlow = async (): Promise<TestUser> => {
  if (testUserCounter.currentUserIndex >= global.users.length) {
    throw new Error("used all test users")
  }

  const testUser = global.users[testUserCounter.currentUserIndex]
  const { data: { id, handle } } = await testAPI.createCurrentUserProfile({ auth: testUser.auth })
  const auth = await testUser.refreshAuth()

  testUserCounter.currentUserIndex = (testUserCounter.currentUserIndex + 1)

  return { id, handle, auth, name: testUser.name }
}
