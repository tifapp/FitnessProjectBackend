import { addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { conn } from "../dbconnection.js"
import { EnvironmentType, ServerEnvironment } from "../env.js"

export const testEnv: ServerEnvironment = {
  // use env vars
  environment: process.env.NODE_ENV as EnvironmentType ?? "dev",
  conn
}

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = testEnv.environment === "staging"
  ? process.env.API_ENDPOINT
  : (() => {
    const app = createApp()
    addCognitoTokenVerification(app, testEnv)
    addRoutes(app, testEnv)
    return app
  })()
