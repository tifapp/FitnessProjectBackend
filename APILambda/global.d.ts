/* eslint-disable no-multiple-empty-lines */
/* eslint-disable semi */
/* eslint-disable no-unused-vars */

export type TestUserInput = { name?: string; isVerified?: boolean }
export type TestUser = { auth: string; id: string }

/* eslint-disable no-var */
declare global {
  var registerUser: (user?: TestUserInput) => Promise<TestUser>
  var defaultUser: TestUser
  var defaultUser2: TestUser
}
