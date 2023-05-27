import { addRoutes, createApp } from "./app.js";

import awsServerlessExpress from "@vendia/serverless-express";
import { addCognitoTokenVerification } from "./auth.js";
import { conn } from "./dbconnection.js";

const app = createApp();
addCognitoTokenVerification(app);
app.use((_, res, next) => {
    conn.refresh()

    next();
  });
addRoutes(app, { conn });

export const handler = awsServerlessExpress({ app });
