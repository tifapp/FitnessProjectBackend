import "TiFBackendUtils"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addTiFRouter, createApp } from "./app"
import { addCognitoTokenVerification } from "./auth"
import { ServerEnvironment } from "./env"
import { addErrorReporting } from "./errorReporting"
import { addEventToRequest } from "./serverlessMiddleware"
import { setProfileCreatedAttribute } from "./user/createUser/setCognitoAttribute"

const env: ServerEnvironment = {
  environment: envVars.ENVIRONMENT,
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  setProfileCreatedAttribute,
  callGeocodingLambda: (location: LocationCoordinate2D) =>
    invokeAWSLambda(`geocodingPipeline:${envVars.ENVIRONMENT}`, location)
}

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addCognitoTokenVerification(app) // TODO: only apply to specific routes
addTiFRouter(app, env)
addErrorReporting(app)

export const handler = awsServerlessExpress({ app })
