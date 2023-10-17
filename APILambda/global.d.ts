/* eslint-disable no-unused-vars */
import { RegisterUserRequest } from "./user/SQL.js";

export type TestUserInput = {name?: string; isVerified?: boolean}
export type TestUser = {authorization: string, profile: RegisterUserRequest}

/* eslint-disable no-var */
declare global {
  var testUsers: TestUser[]
  var generateAuthToken: (user: TestUserInput) => string
}

export { };

