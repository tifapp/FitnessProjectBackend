import awsServerlessExpress from "@vendia/serverless-express"
import {
  LocationCoordinate2D,
  invokeAWSLambda
} from "TiFBackendUtils"
import { addBenchmarking, addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { ServerEnvironment } from "./env.js"
import { addErrorReporting } from "./errorReporting.js"
import { addEventToRequest } from "./serverlessMiddleware.js"
import { setProfileCreatedAttribute } from "./user/createUser/setCognitoAttribute.js"

const env: ServerEnvironment = {
  environment: "prod",
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  setProfileCreatedAttribute,
  callGeocodingLambda: (location: LocationCoordinate2D) =>
    invokeAWSLambda("geocodingPipeline", location)
}

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addCognitoTokenVerification(app, env) // only apply to specific routes
addRoutes(app, env)
addErrorReporting(app)

export const handler = awsServerlessExpress({ app })
