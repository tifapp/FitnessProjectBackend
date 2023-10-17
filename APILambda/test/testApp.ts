import dotenv from "dotenv"
import { Application } from "express"
import { addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { conn } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"

dotenv.config()

export const testEnv: ServerEnvironment = {
  // use env vars
  environment: process.env.TEST_ENV === "staging" ? "staging" : "dev",
  conn
}

export const addBenchmarking = (app: Application) => {
  app.use((req, res, next) => {
    const start = Date.now()
    res.on("finish", () => {
      const duration = Date.now() - start
      console.log(`[${req.method}] ${req.originalUrl} took ${duration}ms`)
    })
    next()
  })
}

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = (() =>
  process.env.TEST_ENV === "staging"
    ? process.env.API_ENDPOINT
    : (() => {
      const app = createApp()
      addBenchmarking(app)
      addCognitoTokenVerification(app, testEnv)
      addRoutes(app, testEnv)
      return app
    })())()
