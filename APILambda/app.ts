import express, { Application } from "express"
import { ServerEnvironment } from "./env.js"
import { createEventRouter } from "./events/createEvent.js"
import { getChatTokenRouter } from "./events/getChatToken.js"
import { getEventByIdRouter } from "./events/getEventById.js"
import { getEventsByRegionRouter } from "./events/getEventsByRegion.js"
import { autocompleteUsersRouter } from "./user/autocompleteUsers.js"
import { createUserProfileRouter } from "./user/createUserProfile.js"
import { deleteUserAccountRouter } from "./user/deleteUserAccount.js"
import { getSelfRouter } from "./user/getSelf.js"
import { getUserRouter } from "./user/getUser.js"
import { sendFriendRequestsRouter } from "./user/sendFriendRequest.js"
import { getUserSettingsRouter } from "./user/settings/getUserSettings.js"
import { updateUserSettingsRouter } from "./user/settings/updateUserSettings.js"
import { updateUserProfileRouter } from "./user/updateUserProfile.js"
import { createValidatedRouter } from "./validation.js"
import { createBlockUserRouter } from "./user/blockUser.js"
import { joinEventRouter } from "./events/joinEventById.js"
import { createRegisterPushTokenRouter } from "./user/registerPushToken.js"
import { createUnblockUserRouter } from "./user/unblockUser.js"

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
      const endMem = process.memoryUsage().heapUsed
      const diffMem = endMem - startMem
      console.table([
        {
          duration: `[${req.method}] ${req.originalUrl} took ${duration}ms`,
          memoryUsage: `${diffMem} bytes`
        }
      ])
    })
    next()
  })
}

const addEventRoutes = (environment: ServerEnvironment) => {
  const router = createValidatedRouter()
  createEventRouter(environment, router)
  getChatTokenRouter(environment, router)
  getEventByIdRouter(environment, router)
  joinEventRouter(environment, router)
  getEventsByRegionRouter(environment, router)
  return router
}

const addUserRoutes = (environment: ServerEnvironment) => {
  const router = createValidatedRouter()
  autocompleteUsersRouter(environment, router)
  createUserProfileRouter(environment, router)
  deleteUserAccountRouter(environment, router)
  getUserSettingsRouter(environment, router)
  getSelfRouter(environment, router)
  getUserRouter(environment, router)
  sendFriendRequestsRouter(router)
  updateUserSettingsRouter(environment, router)
  updateUserProfileRouter(environment, router)
  createBlockUserRouter(router)
  createUnblockUserRouter(router)
  createRegisterPushTokenRouter(router)
  return router
}

/**
 * Adds the main routes to an app.
 *
 * @param app see {@link Application}
 * @param environment see {@link ServerEnvironment}
 */
export const addRoutes = (app: Application, environment: ServerEnvironment) => {
  app.use("/event", addEventRoutes(environment))
  app.use("/user", addUserRoutes(environment))
}
