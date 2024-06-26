import awsServerlessExpress from "@vendia/serverless-express"
import {
  LocationCoordinate2D,
  invokeAWSLambda
} from "TiFBackendUtils"
import { addBenchmarking, addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { ServerEnvironment, envVars } from "./env.js"
import { addErrorReporting } from "./errorReporting.js"
import { addEventToRequest } from "./serverlessMiddleware.js"
import { setProfileCreatedAttribute } from "./user/createUser/setCognitoAttribute.js"

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
addRoutes(app, env)
addErrorReporting(app)

export const handler = awsServerlessExpress({ app })
