import { app } from "./devIndex.js"
import { testEnvVars } from "./testEnv.js"

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = testEnvVars.API_ENDPOINT ?? app
