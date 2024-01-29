import { app } from "./devIndex.js"

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = process.env.TEST_ENV === "staging"
  ? process.env.API_ENDPOINT
  : app
