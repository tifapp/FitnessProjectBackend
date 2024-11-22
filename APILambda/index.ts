import "TiFBackendUtils"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addTiFRouter, createApp } from "./app"
import { ServerEnvironment } from "./env"
import { addEventToRequest } from "./serverlessMiddleware"

const env: ServerEnvironment = envVars.ENVIRONMENT === "devTest"
  ? require("./test/devEnv")
  : {
    environment: envVars.ENVIRONMENT,
    eventStartWindowInHours: 1,
    maxArrivals: 100,
    callGeocodingLambda: (location: LocationCoordinate2D) =>
      invokeAWSLambda(`geocodingPipeline:${envVars.ENVIRONMENT}`, location)
  }

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addTiFRouter(app, env)

export const handler = awsServerlessExpress({ app })
