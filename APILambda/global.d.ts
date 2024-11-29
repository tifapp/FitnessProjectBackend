export type TestUserInput = {
  name?: string
  isVerified?: boolean
  profileExists?: boolean
}
export type TestUser = {
  auth: string
  id: string
  name: string
}

/* eslint-disable no-var */
declare global {
  var registerUser: (user?: TestUserInput) => Promise<TestUser>
  var users: TestUser[]
}
