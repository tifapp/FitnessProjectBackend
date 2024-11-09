import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addTiFRouter, createApp } from "./appMiddleware"
import { ServerEnvironment } from "./env"
import { addEventToRequest } from "./serverlessMiddleware"

const env = {
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

export const app = createApp()

console.log("environment is")
console.log(envVars.ENVIRONMENT)

if (envVars.ENVIRONMENT !== "devTest") {
  addEventToRequest(app)
  addBenchmarking(app)
}

addTiFRouter(app, env)
