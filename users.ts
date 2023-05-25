import express from "express";
import { SQLExecutable, hasResults } from "./dbconnection";
import { ServerEnvironment } from "./env";
import { Connection } from "@planetscale/database";
import { Result } from "./utils";

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const result = await registerUser(environment.conn, {
      id: res.locals.selfId,
      ...req.body,
    });

    if (result.status === "error") {
      return res.status(400).json({ error: result.data });
    }
    return res.status(201).json({ id: res.locals.selfId });
  });

  return router;
};

export type InsertUserRequest = {
  id: string;
  name: string;
  handle: string;
};

export type RegisterUserError = "user-already-exists" | "non-unique-handle";

const registerUser = async (
  conn: Connection,
  request: InsertUserRequest
): Promise<Result<undefined, RegisterUserError>> => {
  return await conn.transaction(async (tx) => {
    if (await userWithIdExists(tx, request.id)) {
      return { status: "error", data: "user-already-exists" };
    }
    await insertUser(tx, request);
    return { status: "success" };
  });
};

const userWithIdExists = async (conn: SQLExecutable, id: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE id = :id", { id });
};

/**
 * Creates a new user in the database.
 *
 * @param conn see {@link SQLExecutable}
 * @param request see {@link InsertUserRequest}
 */
export const insertUser = async (
  conn: SQLExecutable,
  request: InsertUserRequest
) => {
  await conn.execute(
    `INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)`,
    request
  );
};
