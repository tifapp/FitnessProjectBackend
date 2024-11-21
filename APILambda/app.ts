import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addBenchmarking, addTiFRouter, createApp } from "./appMiddleware"
import { ServerEnvironment } from "./env"
import { addEventToRequest } from "./serverlessMiddleware"

const env = envVars.ENVIRONMENT === "devTest"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

export const app = createApp()

const middlewareMap = {
  devTest: [addTiFRouter],
  live: [addEventToRequest, addBenchmarking, addTiFRouter]
}

middlewareMap[envVars.ENVIRONMENT === "devTest" ? "devTest" : "live"].forEach(handler => handler(app, env))
