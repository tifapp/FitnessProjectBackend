import { app } from "./app";

import awsServerlessExpress from "@vendia/serverless-express";
import { addCognitoTokenVerification } from "./auth";

addCognitoTokenVerification(app);
export const handler = awsServerlessExpress({ app });
