import { promiseResult, success } from "TiFBackendUtils"
import { addBenchmarking, addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

export const testEnv: ServerEnvironment = {
  environment: "dev",
  eventStartWindowInHours: 1,
  maxArrivals: 4,
  setProfileCreatedAttribute: () => promiseResult(success())
}

export const app = createApp()
addBenchmarking(app)
addCognitoTokenVerification(app, testEnv)
addRoutes(app, testEnv)
