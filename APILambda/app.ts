import express, { Application } from "express"
import { ServerEnvironment } from "./env.js"
import { createEventRouter } from "./events/createEvent.js"
import { getChatTokenRouter } from "./events/getChatToken.js"
import { getEventByIdRouter } from "./events/getEventById.js"
import { getEventsByRegionRouter } from "./events/getEventsByRegion.js"
import { autocompleteUsersRouter } from "./user/autocompleteUsers.js"
import { createUserProfileRouter } from "./user/createUserProfile.js"
import { deleteUserAccountRouter } from "./user/deleteUserAccount.js"
import { getCurrentUserSettingsRouter } from "./user/getCurrentUserSettings.js"
import { getUserBasedOnIdRouter } from "./user/getUserBasedOnId.js"
import { getUserInfoRouter } from "./user/getUserInfo.js"
import { sendFriendRequestsRouter } from "./user/sendFriendRequest.js"
import { updateCurrentUserSettingsRouter } from "./user/updateCurrentUserSettings.js"
import { updateUserProfileRouter } from "./user/updateUserProfile.js"
import { ValidatedRouter } from "./validation.js"

/**
 * Creates an application instance.
 *
 * @param environment see {@link ServerEnvironment}
 * @returns a express js app instance
 */
export const createApp = () => {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  return app
}

export const addBenchmarking = (app: Application) => {
  app.use((req, res, next) => {
    const start = Date.now()
    const startMem = process.memoryUsage().heapUsed
    res.on("finish", () => {
      const duration = Date.now() - start
      console.log(`[${req.method}] ${req.originalUrl} took ${duration}ms`)
      const endMem = process.memoryUsage().heapUsed
      const diffMem = endMem - startMem
      console.log(`Memory change for the request: ${diffMem} bytes`)
    })
    next()
  })
}

const addEventRoutes = (environment: ServerEnvironment) => {
  const router = new ValidatedRouter()
  createEventRouter(environment, router)
  getChatTokenRouter(environment, router)
  getEventByIdRouter(environment, router)
  getEventsByRegionRouter(environment, router)
  return router
}

const addUserRoutes = (environment: ServerEnvironment) => {
  const router = new ValidatedRouter()
  autocompleteUsersRouter(environment, router.asRouter())
  createUserProfileRouter(environment, router)
  deleteUserAccountRouter(environment, router)
  getCurrentUserSettingsRouter(environment, router)
  getUserInfoRouter(environment, router)
  getUserBasedOnIdRouter(environment, router)
  sendFriendRequestsRouter(environment, router)
  updateCurrentUserSettingsRouter(environment, router)
  updateUserProfileRouter(environment, router)
  return router
}

/**
 * Adds the main routes to an app.
 *
 * @param app see {@link Application}
 * @param environment see {@link ServerEnvironment}
 */
export const addRoutes = (app: Application, environment: ServerEnvironment) => {
  app.use("/event", addEventRoutes(environment).asRouter())
  app.use("/user", addUserRoutes(environment).asRouter())
}
