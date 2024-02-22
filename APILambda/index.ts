import awsServerlessExpress, {
  getCurrentInvoke
} from "@vendia/serverless-express"
import {
  SearchClosestAddressToCoordinates,
  invokeAWSLambda
} from "TiFBackendUtils"
import express, { Express } from "express"
import { addBenchmarking, addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { ServerEnvironment } from "./env.js"
import { addErrorReporting } from "./errorReporting.js"
import { setProfileCreatedAttribute } from "./user/createUser/setCognitoAttribute.js"

export const addEventToRequest = (app: Express) => {
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
  setProfileCreatedAttribute: (userId: string) => setProfileCreatedAttribute(userId),
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  SearchClosestAddressToCoordinates,
  callGeocodingLambda: (latitude: number, longitude: number) =>
    invokeAWSLambda("geocodingPipeline", {
      location: { latitude, longitude }
    })
}

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addCognitoTokenVerification(app, env) // only apply to specific routes
addRoutes(app, env)
addErrorReporting(app)

export const handler = awsServerlessExpress({ app })
