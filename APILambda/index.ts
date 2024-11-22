import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { envVars } from "TiFBackendUtils/env"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { app } from "./app"

addLogHandler(consoleLogHandler())

if (envVars.ENVIRONMENT !== "devTest") {
  module.exports.handler = awsServerlessExpress({ app })
}
