import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import awsServerlessExpress from "@vendia/serverless-express"
import { app } from "./app"

// addLogHandler(consoleLogHandler())

export const handler = awsServerlessExpress({ app })
