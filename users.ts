import express from "express";
import { SQLExecutable, hasResults } from "./dbconnection";
import { ServerEnvironment } from "./env";
import { Connection } from "@planetscale/database";

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      if (await userWithIdExists(tx, res.locals.selfId)) {
        return res.status(400).json({ error: "user-already-exists" });
      }

      if (await userWithHandleExists(tx, req.body.handle)) {
        return res.status(400).json({ error: "duplicate-handle" });
      }

      await insertUser(tx, {
        id: res.locals.selfId,
        ...req.body,
      });
      return res.status(201).json({ id: res.locals.selfId });
    });
  });

  return router;
};

const userWithHandleExists = async (conn: SQLExecutable, handle: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE handle = :handle", {
    handle,
  });
};

const userWithIdExists = async (conn: SQLExecutable, id: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE id = :id", { id });
};

export type InsertUserRequest = {
  id: string;
  name: string;
  handle: string;
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
