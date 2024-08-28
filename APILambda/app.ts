import express, { Application } from "express"
import { ServerEnvironment } from "./env"
import { getUpcomingEventsByRegionRouter } from "./events/arrivals/getUpcomingEvents"
import { setArrivalStatusRouter } from "./events/arrivals/setArrivalStatus"
import { setDepartureRouter } from "./events/arrivals/setDeparture"
import { createEventRouter } from "./events/createEvent"
import { getAttendeesByEventIdRouter } from "./events/getAttendees"
import { getChatTokenRouter } from "./events/getChatToken"
import { getEventByIdRouter } from "./events/getEventById"
import { getEventsByRegionRouter } from "./events/getEventsByRegion"
import { joinEventRouter } from "./events/joinEventById"
import { leaveEventRouter } from "./events/leaveEvent"
import { endEventRouter } from "./events/endEvent"
import { autocompleteUsersRouter } from "./user/autocompleteUsers"
import { createBlockUserRouter } from "./user/blockUser"
import { createUserProfileRouter } from "./user/createUser/createUserProfile"
import { deleteUserAccountRouter } from "./user/deleteUserAccount"
import { getSelfRouter } from "./user/getSelf"
import { getUserRouter } from "./user/getUser"
import { createRegisterPushTokenRouter } from "./user/registerPushToken"
import { sendFriendRequestsRouter } from "./user/sendFriendRequest"
import { getUserSettingsRouter } from "./user/settings/getUserSettings"
import { updateUserSettingsRouter } from "./user/settings/updateUserSettings"
import { createUnblockUserRouter } from "./user/unblockUser"
import { updateUserProfileRouter } from "./user/updateUserProfile"
import { ValidatedRouter, createValidatedRouter } from "./validation"

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

// instead of here, should be aggregated in the jest suite
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

const addEventRoutes = (router: ValidatedRouter, environment: ServerEnvironment) => {
  createEventRouter(environment, router)
  getChatTokenRouter(environment, router)
  getEventByIdRouter(environment, router)
  joinEventRouter(environment, router)
  leaveEventRouter(environment, router)
  endEventRouter(environment, router)
  setArrivalStatusRouter(environment, router)
  setDepartureRouter(environment, router)
  getUpcomingEventsByRegionRouter(environment, router)
  getAttendeesByEventIdRouter(environment, router)
  getEventsByRegionRouter(environment, router)
  return router
}

const addUserRoutes = (router: ValidatedRouter, environment: ServerEnvironment) => {
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
  app.use("/event", addEventRoutes(createValidatedRouter(environment.routeCollector?.("/event")), environment))
  app.use("/user", addUserRoutes(createValidatedRouter(environment.routeCollector?.("/user")), environment))
}
