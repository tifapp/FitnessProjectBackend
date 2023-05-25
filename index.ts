import { addRoutes, createApp } from "./app";

import awsServerlessExpress from "@vendia/serverless-express";
import { addCognitoTokenVerification } from "./auth";
import { conn } from "./dbconnection";

const app = createApp();
addCognitoTokenVerification(app);
addRoutes(app, { conn });

export const handler = awsServerlessExpress({ app });
