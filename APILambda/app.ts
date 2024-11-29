import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { invokeAWSLambda } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { NamedLocation } from "TiFShared/lib/Types/NamedLocation"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { addBenchmarking, addTiFRouter, createApp } from "./appMiddleware"
import { ServerEnvironment } from "./env"
import { addEventToRequest } from "./serverlessMiddleware"

addLogHandler(consoleLogHandler())

const env: ServerEnvironment = {
  environment: envVars.ENVIRONMENT,
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  geocode: (location: EventEditLocation) =>
    invokeAWSLambda<NamedLocation>(
      `geocodingPipeline:${envVars.ENVIRONMENT}`,
      location,
      {
        coordinate: { latitude: 0, longitude: 0 },
        placemark: {
          name: "Unknown Location"
        }
      }
    )
}

const app = createApp(env, addEventToRequest, addBenchmarking, addTiFRouter)

export const handler = awsServerlessExpress({ app })
