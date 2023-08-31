import { Application } from "express"
import { addRoutes, createApp } from "../app.js"
import { UNAUTHORIZED_RESPONSE } from "../auth.js"
import { ServerEnvironment } from "../env.js"

/**
 * Creates a test environment application.
 *
 * @param environment see {@link ServerEnvironment}
 * @returns an express app instance suitable for testing
 */
export const createTestApp = (environment: ServerEnvironment) => {
  const app = createApp()
  addTestAuth(app)
  addRoutes(app, environment)
  return app
}

// NB: We already have Cognito to peform auth for us, and trying to simulate precise
// conditions involving sending a proper cognito token is not a worth it tradeoff given the
// costs (having to have a non-expired cognito token for each test, etc.)
const addTestAuth = (app: Application) => {
  app.use((req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json(UNAUTHORIZED_RESPONSE)
    }
    res.locals.selfId = req.headers.authorization
    next()
  })
}
