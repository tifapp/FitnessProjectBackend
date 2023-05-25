import { SQLExecutable } from "./dbconnection";

export type CreateUserRequest = {
  id: string;
  name: string;
  handle: string;
  email?: string;
  phoneNumber?: string;
};

/**
 * Creates a new user in the database.
 *
 * @param conn see {@link SQLExecutable}
 * @param request see {@link CreateUserRequest}
 */
export const createUser = async (
  conn: SQLExecutable,
  request: CreateUserRequest
) => {
  await conn.execute(
    `INSERT INTO user (id, name, handle, email, phoneNumber) VALUES (:id, :name, :handle, :email, :phoneNumber)`,
    request
  );
};
