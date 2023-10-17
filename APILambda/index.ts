import awsServerlessExpress, {
  getCurrentInvoke
} from "@vendia/serverless-express"
import express, { Express } from "express"
import { addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { conn } from "./dbconnection.js"
import { ServerEnvironment } from "./env.js"

const addEventToRequest = (app: Express) => {
  app.use((req, res, next) => {
    const { event } = getCurrentInvoke()

    // TODO: Find better solution
    for (const [key, value] of Object.entries(event)) {
      Object.defineProperty(req, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      })
    } // WARN: ensure fields in "event" do not overwrite fields in "req"

    Object.defineProperty(req, "body", {
      value: JSON.parse(req.body),
      writable: true,
      enumerable: true,
      configurable: true
    })

    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
}

const env: ServerEnvironment = { conn, environment: "prod" }

const app = createApp()
addEventToRequest(app)
addCognitoTokenVerification(app, env) // only apply to specific routes
addRoutes(app, env)

export const handler = awsServerlessExpress({ app })
