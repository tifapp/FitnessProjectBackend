import app from "./app";

import awsServerlessExpress from "@vendia/serverless-express";

export const handler = awsServerlessExpress({ app });
