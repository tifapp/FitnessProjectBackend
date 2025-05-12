import "TiFBackendUtils"
import "TiFShared/lib/Zod"
// Only used in local tests

import { handler } from "../../GeocodingLambda/handler"
import { addTiFRouter, createApp } from "../appMiddleware"
import { ServerEnvironment } from "../env"
import { localhostListener } from "./localhostListener"
import { geocodeMock } from "./location"
import { mockLocationCoordinate2D } from "./testEvents"

export const devEnv: ServerEnvironment = {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  geocode: (location) => {
    return handler(location, geocodeMock, async () => mockLocationCoordinate2D())
  }
}

let originalDevEnv: ServerEnvironment | null = null

export const overrideDevEnv = (partialDevEnv: Partial<ServerEnvironment>) => {
  if (!originalDevEnv) {
    originalDevEnv = { ...devEnv }
  }

  Object.assign(devEnv, partialDevEnv)
}

export const restoreDevEnv = () => {
  if (originalDevEnv) {
    Object.assign(devEnv, originalDevEnv)
    originalDevEnv = null
  }
}

const middlewares = [addTiFRouter]
if (process.env.NODE_ENV !== "test") {
  middlewares.push(localhostListener)
}
export const devApp = createApp(devEnv, ...middlewares)
