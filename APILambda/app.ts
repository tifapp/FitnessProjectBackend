import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { addBenchmarking, addTiFRouter, createApp } from "./appMiddleware"
import { ServerEnvironment } from "./env"
import { addEventToRequest } from "./serverlessMiddleware"

const env =
  envVars.ENVIRONMENT === "devTest"
    ? // test imports must be dynamic because they aren't built into the deployed server
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("./test/devIndex")
    : ({
        environment: envVars.ENVIRONMENT,
        eventStartWindowInHours: 1,
        maxArrivals: 100,
        callGeocodingLambda: async (locationEdit: EventEditLocation) =>
          // @ts-ignore
          await invokeAWSLambda(
            `geocodingPipeline:${envVars.ENVIRONMENT}`,
            locationEdit
          )
      } as ServerEnvironment)

export const app = createApp()

const middlewareMap = {
  // test imports must be dynamic because they aren't built into the deployed server
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  devTest: [addTiFRouter],
  live: [addEventToRequest, addBenchmarking, addTiFRouter]
}

middlewareMap[envVars.ENVIRONMENT === "devTest" ? "devTest" : "live"].forEach(
  (handler) => handler(app, env)
)
