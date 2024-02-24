import awsServerlessExpress from "@vendia/serverless-express"
import { LocationCoordinate2D, invokeAWSLambda } from "TiFBackendUtils"
import { addBenchmarking, addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { ServerEnvironment } from "./env.js"
import { addEventToRequest } from "./index.js"
import { setProfileCreatedAttribute } from "./user/createUser/setCognitoAttribute.js"

// do not import anything from ./test here, wont be accessible in deployment
const stagingEnv: ServerEnvironment = {
  setProfileCreatedAttribute,
  callGeocodingLambda: (location: LocationCoordinate2D) =>
    invokeAWSLambda("geocodingPipeline", location),
  environment: "staging",
  maxArrivals: 4,
  eventStartWindowInHours: 1
}

const app = createApp()
addBenchmarking(app)
addCognitoTokenVerification(app, stagingEnv)
addRoutes(app, stagingEnv)
addEventToRequest(app)
export const handler = awsServerlessExpress({ app })
