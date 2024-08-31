/* eslint-disable import/first */
import "TiFShared"
import "TiFShared/lib/Math"; // needed to compile.
import "TiFShared/lib/Zod"; // needed to compile. ex. https://github.com/tifapp/FitnessProject/pull/292/files#diff-a4dfe41a791ca7dcea4d8279bf1092ec069a6355c1a16fc815f91ee521a9b053R8

import awsServerlessExpress from "@vendia/serverless-express"
import {
  envVars,
  invokeAWSLambda
} from "TiFBackendUtils"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addRoutes, createApp } from "./app"
import { addCognitoTokenVerification } from "./auth"
import { ServerEnvironment } from "./env"
import { addErrorReporting } from "./errorReporting"
import { addEventToRequest } from "./serverlessMiddleware"
import { setProfileCreatedAttribute } from "./user/createUser/setCognitoAttribute"
console.log("imported others")

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
