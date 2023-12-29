/* eslint-disable no-multiple-empty-lines */
/* eslint-disable semi */
/* eslint-disable no-unused-vars */

export type TestUserInput = { name?: string; isVerified?: boolean; profileExists?: boolean; }
export type TestUser = { auth: string; id: string, refreshAuth: () => Promise<string>, name: string }

/* eslint-disable no-var */
declare global {
  var registerUser: (user?: TestUserInput) => Promise<TestUser>
  var unregisteredUser: TestUser
  var users: TestUser[]
}
