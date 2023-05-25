import { getCurrentInvoke } from "@vendia/serverless-express";
import { Application } from "express";

/**
 * Adds AWS cognito token verification to an app.
 */
export const addCognitoTokenVerification = (app: Application) => {
  app.use((req, res, next) => {
    const { event } = getCurrentInvoke();

    if (event?.headers?.Authorization != null) {
      const token = event.headers.Authorization.split(" ")[1];

      const claims = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );

      req.userId = claims!.sub;
    }

    next();
  });
};
