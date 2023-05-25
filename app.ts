import express from "express";
import { ServerEnvironment } from "./env";
import { conn } from "./dbconnection";

/**
 * Creates an application instance.
 *
 * @param environment see {@link ServerEnvironment}
 * @returns a express js app instance
 */
export const createApp = (environment: ServerEnvironment) => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
};

/**
 * A singleton app instance.
 */
export const app = createApp({ conn });
