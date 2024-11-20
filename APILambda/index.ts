import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { addBenchmarking, addTiFRouter, createApp } from "./app"
import { ServerEnvironment } from "./env"
import { addErrorReporting } from "./errorReporting"
import { addEventToRequest } from "./serverlessMiddleware"

const env = envVars.ENVIRONMENT === "devTest"
  ? require("./test/devIndex")
  : {
    environment: envVars.ENVIRONMENT,
    eventStartWindowInHours: 1,
    maxArrivals: 100,
    callGeocodingLambda: async (location: LocationCoordinate2D) => {
      await invokeAWSLambda(
        `geocodingPipeline:${envVars.ENVIRONMENT}`,
        location
      )
    }
  } as ServerEnvironment

addLogHandler(consoleLogHandler())

export const app = createApp()

const middlewareMap = {
  devTest: [addBenchmarking, addTiFRouter],
  live: [addEventToRequest, addBenchmarking, addTiFRouter, addErrorReporting]
}

middlewareMap[envVars.ENVIRONMENT === "devTest" ? "devTest" : "live"].forEach(handler => handler(app, env))

if (envVars.ENVIRONMENT === "devTest") {
  console.log(
    `Running TiFBackend on http://${envVars.DEV_TEST_HOST}:${envVars.DEV_TEST_PORT}`
  )
  app.listen(envVars.DEV_TEST_PORT, envVars.DEV_TEST_HOST)
} else {
  module.exports.handler = awsServerlessExpress({ app })
}
