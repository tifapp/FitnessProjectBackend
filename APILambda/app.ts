import express, { Application } from "express"
import { ServerEnvironment } from "./env.js"
import { createEventRouter } from "./events/createEvent.js"
import { createChatTokenRouter } from "./events/getChatToken.js"
import { createEventByIdRouter } from "./events/getEventById.js"
import { createEventsByRegionRouter } from "./events/getEventsByRegion.js"
import { createUserRouter } from "./user/createUser.js"
import { deleteUserAccountRouter } from "./user/deleteUserAccount.js"
import { getCurrentUserSettingsRouter } from "./user/getCurrentUserSettings.js"
import { getUserBasedOnIdRouter } from "./user/getUserBasedOnId.js"
import { getUserInfoRouter } from "./user/getUserInfo.js"
import { sendFriendRequestsRouter } from "./user/sendFriendRequest.js"
import { updateCurrentUserSettingsRouter } from "./user/updateCurrentUserSettings.js"
import { updateUserProfileRouter } from "./user/updateUserProfile.js"

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

const addEventRoutes = (environment: ServerEnvironment) => {
  const router = express.Router()
  createEventRouter(environment, router)
  createChatTokenRouter(environment, router)
  createEventByIdRouter(environment, router)
  createEventsByRegionRouter(environment, router)
  return router
}

const addUserRoutes = (environment: ServerEnvironment) => {
  const router = express.Router()
  createUserRouter(environment, router)
  deleteUserAccountRouter(environment, router)
  getCurrentUserSettingsRouter(environment, router)
  getUserBasedOnIdRouter(environment, router)
  getUserInfoRouter(environment, router)
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
  app.use("/event", addEventRoutes(environment))
  app.use("/user", addUserRoutes(environment))
}
