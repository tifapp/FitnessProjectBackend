import express, { Application } from "express"
import { ServerEnvironment } from "./env"
import { upcomingEventArrivalRegions } from "./events/arrivals/getUpcomingEvents"
import { arriveAtRegion } from "./events/arrivals/setArrivalStatus"
import { departFromRegion } from "./events/arrivals/setDeparture"
import { createEvent } from "./events/createEvent"
import { endEvent } from "./events/endEvent"
import { attendeesList } from "./events/getAttendees"
import { eventDetails } from "./events/getEventById"
import { exploreEvents } from "./events/getEventsByRegion"
import { joinEvent } from "./events/joinEventById"
import { leaveEvent } from "./events/leaveEvent"
import { TiFRouter } from "./router"
import { autocompleteUsers } from "./user/autocompleteUsers"
import { blockUser } from "./user/blockUser"
import { createCurrentUserProfile } from "./user/createUser/createUserProfile"
import { removeAccount } from "./user/deleteUserAccount"
import { getSelf } from "./user/getSelf"
import { getUser } from "./user/getUser"
import { registerForPushNotifications } from "./user/registerPushToken"
import { sendFriendRequest } from "./user/sendFriendRequest"
import { userSettings } from "./user/settings/getUserSettings"
import { saveUserSettings } from "./user/settings/updateUserSettings"
import { unblockUser } from "./user/unblockUser"
import { updateCurrentUserProfile } from "./user/updateUserProfile"

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

export const addTiFRouter = (app: Application, environment: ServerEnvironment) =>
  app.use("/",
    TiFRouter({
      createEvent,
      eventDetails,
      joinEvent,
      leaveEvent,
      endEvent,
      arriveAtRegion,
      departFromRegion,
      upcomingEventArrivalRegions,
      attendeesList,
      exploreEvents,
      autocompleteUsers,
      createCurrentUserProfile,
      removeAccount,
      getSelf,
      getUser,
      userSettings,
      saveUserSettings,
      updateCurrentUserProfile,
      sendFriendRequest,
      blockUser,
      unblockUser,
      registerForPushNotifications
    }, environment)
  )
