import { getCurrentInvoke } from "@vendia/serverless-express";
import { Application } from "express";

/**
 * Adds AWS cognito token verification to an app.
 */
export const addCognitoTokenVerification = (app: Application) => {
  app.use((req, res, next) => {
    const { event } = getCurrentInvoke();
    if (!event?.headers?.Authorization) {
      res.status(401).write("Unauthorized");
      return;
    }

    const token = event.headers.Authorization.split(" ")[1];

    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    req.params.selfId = claims!.sub;

    next();
  });
};
