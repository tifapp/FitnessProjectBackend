import awsServerlessExpress, {
  getCurrentInvoke
} from "@vendia/serverless-express"
import express, { Express } from "express"
import { addBenchmarking, addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { ServerEnvironment } from "./env.js"
import { addErrorReporting } from "./errorReporting.js"
import {
  LocationCoordinate2D,
  SearchForPositionResultToPlacemark
} from "TiFBackendUtils"

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

const env: ServerEnvironment = {
  environment: "prod",
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  SearchForPositionResultToPlacemark: (location: LocationCoordinate2D) =>
    SearchForPositionResultToPlacemark(location)
}

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addCognitoTokenVerification(app, env) // only apply to specific routes
addRoutes(app, env)
addErrorReporting(app)

export const handler = awsServerlessExpress({ app })
