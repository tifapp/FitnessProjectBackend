import express, { Application } from "express";
import { SQLExecutable } from "./dbconnection";
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
    await insertUser(environment.conn, {
      id: res.locals.selfId,
      ...req.body,
    });
    return res.status(201).json({ id: res.locals.selfId });
  });

  return router;
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
