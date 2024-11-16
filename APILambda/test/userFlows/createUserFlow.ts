import "TiFShared/lib/Zod"

import { UserHandle } from "TiFShared/domain-models/User"
import { TestUser } from "../../global"
import { testAPI } from "../testApp"
import { createMockAuthToken } from "../createMockUsers"

export const testUserCounter = { currentUserIndex: 0 }

export type RegisteredTestUser = TestUser & { handle: UserHandle }

export const userDetails = (user: RegisteredTestUser) => ({
  id: user.id,
  handle: user.handle,
  name: user.name
})

// database is reset for each test so we need to create a new auth for each test
export const createUserFlow = async (): Promise<RegisteredTestUser> => {
  const testUser = await createMockAuthToken()
  const resp = await testAPI.createCurrentUserProfile<201>({
    noAuth: true,
    body: { name: testUser.name }
  })
  return { ...resp.data, auth: `Bearer ${resp.data.token}` }
}
