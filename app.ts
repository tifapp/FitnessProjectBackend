import express, { Application } from "express";
import { ServerEnvironment } from "./env";
import { createUserRouter } from "./users";
import { EventRouter } from "./events";

/**
 * Creates an application instance.
 *
 * @param environment see {@link ServerEnvironment}
 * @returns a express js app instance
 */
export const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
};

/**
 * Adds the main routes to an app.
 *
 * @param app see {@link Application}
 * @param environment see {@link ServerEnvironment}
 */
export const addRoutes = (app: Application, environment: ServerEnvironment) => {
  app.use("/user", createUserRouter(environment));
  app.use("/event", EventRouter(environment));
};
