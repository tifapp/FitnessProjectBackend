import { addBenchmarking, addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

// deploy one test env for the stage tests. if those pass, then deploy the actual env to stage
export const testEnv: ServerEnvironment = {
  // use env vars
  environment: process.env.TEST_ENV === "staging" ? "staging" : "dev",
  eventStartWindowInHours: 1,
  maxArrivals: 4 // will not work in the stage tests :(
}

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = process.env.TEST_ENV === "staging"
  ? process.env.API_ENDPOINT
  : (() => {
    const app = createApp()
    addBenchmarking(app)
    addCognitoTokenVerification(app, testEnv)
    addRoutes(app, testEnv)
    return app
  })()
