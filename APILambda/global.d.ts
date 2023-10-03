/* eslint-disable no-unused-vars */
import { RegisterUserRequest } from "./user/SQL.js";

export type TestUser = {authorization: string, profile: RegisterUserRequest};

/* eslint-disable no-var */
declare global {
  var testUsers: TestUser[]
}

export { };

