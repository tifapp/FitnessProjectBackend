import app from "./app.js";

import awsServerlessExpress from "@vendia/serverless-express";

export const handler = awsServerlessExpress({ app });
