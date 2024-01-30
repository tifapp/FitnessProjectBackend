import { callPostUser } from "../apiCallers/users.js"

export const testUserCounter = { currentUserIndex: 0 }

// database is reset for each test so we need to create a new auth for each test
export const createUserFlow = async (): Promise<{handle: string, userId: string, token: string, name: string}> => {
  if (testUserCounter.currentUserIndex >= global.users.length) {
    throw new Error("used all test users")
  }

  const testUser = global.users[testUserCounter.currentUserIndex]
  const { body: { id: userId, handle } } = await callPostUser(testUser.auth)
  const token = await testUser.refreshAuth()

  testUserCounter.currentUserIndex = (testUserCounter.currentUserIndex + 1)

  return { userId, handle: handle.rawValue, token, name: testUser.name }
}
