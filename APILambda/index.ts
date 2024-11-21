import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { app } from "./app"

addLogHandler(consoleLogHandler())

export const handler = awsServerlessExpress({ app })
