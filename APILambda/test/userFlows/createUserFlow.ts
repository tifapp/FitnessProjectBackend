import { callPostUser } from "../apiCallers/userEndpoints.js";

export type TestUser = {handle: string, userId: string, token: string, name: string};

export const testUserCounter = { currentUserIndex: 0 }

// database is reset for each test so we need to create a new auth for each test
export const createUserFlow = async (): Promise<TestUser> => {
  if (testUserCounter.currentUserIndex >= global.users.length) {
    throw new Error("used all test users")
  }

  const testUser = global.users[testUserCounter.currentUserIndex]
  const { body: { id: userId, handle } } = await callPostUser(testUser.auth)
  const token = await testUser.refreshAuth()

  testUserCounter.currentUserIndex = (testUserCounter.currentUserIndex + 1)

  return { userId, handle, token, name: testUser.name }
}
