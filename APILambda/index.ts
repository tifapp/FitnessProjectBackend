import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { envVars } from "TiFBackendUtils/env"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { app } from "./app"

addLogHandler(consoleLogHandler())

let server: ReturnType<typeof app.listen>

if (envVars.ENVIRONMENT === "devTest") {
  console.log(
    `Running TiFBackend on http://${envVars.DEV_TEST_HOST}:${envVars.DEV_TEST_PORT}`
  )
  server = app.listen(envVars.DEV_TEST_PORT, envVars.DEV_TEST_HOST)
} else {
  module.exports.handler = awsServerlessExpress({ app })
}

export const closeServer = () => {
  if (server) {
    server.close()
  }
}
