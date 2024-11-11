import "TiFBackendUtils"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addTiFRouter, createApp } from "./app"
import { ServerEnvironment } from "./env"
import { addErrorReporting } from "./errorReporting"
import { addEventToRequest } from "./serverlessMiddleware"

const env: ServerEnvironment = {
  environment: envVars.ENVIRONMENT,
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  callGeocodingLambda: async (location: LocationCoordinate2D) => {
    await invokeAWSLambda(`geocodingPipeline:${envVars.ENVIRONMENT}`, location)
  }
}

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addTiFRouter(app, env)
addErrorReporting(app)

if (envVars.ENVIRONMENT === "devTest") {
  app.listen(envVars.DEV_TEST_PORT, envVars.DEV_TEST_HOST)
} else {
  module.exports.handler = awsServerlessExpress({ app })
}
