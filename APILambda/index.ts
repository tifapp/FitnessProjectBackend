import { addRoutes, createApp } from "./app.js"

import awsServerlessExpress from "@vendia/serverless-express"
import { addCognitoTokenVerification } from "./auth.js"
import { conn } from "./dbconnection.js"

const app = createApp()
addCognitoTokenVerification(app)
addRoutes(app, { conn, environment: "prod" })

export const handler = awsServerlessExpress({ app })
