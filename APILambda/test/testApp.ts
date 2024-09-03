import { envVars } from "TiFBackendUtils/env"
import { app } from "./devIndex"
import { testEnvVars } from "./testEnv"

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = envVars.ENVIRONMENT === "stagingTest" ? testEnvVars.API_ENDPOINT : app
