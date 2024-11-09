import "TiFShared/lib/Zod"

import { UserHandle } from "TiFShared/domain-models/User"
import { TestUser } from "../../global"
import { testAPI } from "../testApp"

export const testUserCounter = { currentUserIndex: 0 }

export type RegisteredTestUser = TestUser & { handle: UserHandle }

// database is reset for each test so we need to create a new auth for each test
export const createUserFlow = async (): Promise<RegisteredTestUser> => {
  if (testUserCounter.currentUserIndex >= global.users.length) {
    throw new Error("used all test users")
  }

  const testUser = global.users[testUserCounter.currentUserIndex]
  const {
    data: { handle }
  } = await testAPI.createCurrentUserProfile({ auth: testUser.auth })
  await testUser.refreshAuth()

  testUserCounter.currentUserIndex = testUserCounter.currentUserIndex + 1

  return { ...testUser, handle }
}
