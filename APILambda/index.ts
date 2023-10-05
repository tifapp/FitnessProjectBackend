import awsServerlessExpress from "@vendia/serverless-express"
import { addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { conn } from "./dbconnection.js"
import { ServerEnvironment } from "./env.js"

const env: ServerEnvironment = { conn, environment: "prod" }

const app = createApp()
addCognitoTokenVerification(app, env) // only apply to specific routes
addRoutes(app, env)

export const handler = awsServerlessExpress({ app })
