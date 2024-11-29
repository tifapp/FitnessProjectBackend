import { getCurrentInvoke } from "@vendia/serverless-express"
import express, { Express } from "express"

export const addEventToRequest = (app: Express) => {
  app.use((req, res, next) => {
    const { event } = getCurrentInvoke()

    // TODO: Find better solution. ensure fields in "event" do not overwrite fields in "req"
    for (const [key, value] of Object.entries(event)) {
      Object.defineProperty(req, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      })
    }

    const normalizedHeaders: Record<string, string | string[]> = {}
    for (const [key, value] of Object.entries((event.headers as Record<string, string | string[]> || {}))) {
      normalizedHeaders[key.toLowerCase()] = value
    }

    req.headers = {
      ...req.headers,
      ...normalizedHeaders
    }

    if (req.body && typeof req.body === "string") {
      Object.defineProperty(req, "body", {
        value: JSON.parse(req.body),
        writable: true,
        enumerable: true,
        configurable: true
      })
    }

    next()
  })

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  return app
}
