import { addBenchmarking, addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { conn } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"

export const testEnv: ServerEnvironment = {
  // use env vars
  environment: process.env.TEST_ENV === "staging" ? "staging" : "dev",
  conn
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
