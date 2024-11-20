import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addTiFRouter, createApp } from "./app"
import { ServerEnvironment } from "./env"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { addErrorReporting } from "./errorReporting"
import { addEventToRequest } from "./serverlessMiddleware"
import { handler } from "../GeocodingLambda"

const env: ServerEnvironment = {
  environment: envVars.ENVIRONMENT,
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  callGeocodingLambda: async (location: LocationCoordinate2D) => {
    if (envVars.ENVIRONMENT === "devTest") {
      await handler(location)
    } else {
      await invokeAWSLambda(
        `geocodingPipeline:${envVars.ENVIRONMENT}`,
        location
      )
    }
  }
}

addLogHandler(consoleLogHandler())

const app = createApp()
if (envVars.ENVIRONMENT !== "devTest") {
  addEventToRequest(app)
}
addBenchmarking(app)
addTiFRouter(app, env)
addErrorReporting(app)

if (envVars.ENVIRONMENT === "devTest") {
  console.log(
    `Running TiFBackend on http://${envVars.DEV_TEST_HOST}:${envVars.DEV_TEST_PORT}`
  )
  app.listen(envVars.DEV_TEST_PORT, envVars.DEV_TEST_HOST)
} else {
  module.exports.handler = awsServerlessExpress({ app })
}
