import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { addBenchmarking, addTiFRouter, createApp } from "./appMiddleware"
import { ServerEnvironment } from "./env"
import { addEventToRequest } from "./serverlessMiddleware"

addLogHandler(consoleLogHandler())

const env: ServerEnvironment = {
  environment: envVars.ENVIRONMENT,
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  callGeocodingLambda: async (location: LocationCoordinate2D) => {
    await invokeAWSLambda(
      `geocodingPipeline:${envVars.ENVIRONMENT}`,
      location
    )
  }
}

const app = createApp(env, addEventToRequest, addBenchmarking, addTiFRouter)

export const handler = awsServerlessExpress({ app })
