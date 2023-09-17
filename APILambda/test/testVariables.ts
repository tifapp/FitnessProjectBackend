import { faker } from "@faker-js/faker"
import { randomUUID } from "crypto"
import { Application } from "express"
import { addRoutes, createApp } from "../app.js"
import { UNAUTHORIZED_RESPONSE } from "../auth.js"
import { conn } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"
import { CreateEventInput } from "../events/index.js"
import { RegisterUserRequest } from "../user/SQL.js"

export const testEnv: ServerEnvironment = {
  // use env vars
  environment: process.env.USER_TOKEN ? "staging" : "dev",
  conn
}

const addTestAuth = (app: Application) => {
  app.use((req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json(UNAUTHORIZED_RESPONSE)
    }
    res.locals.selfId = req.headers.authorization
    next()
  })
}

/**
 * Creates a test environment application.
 *
 * @returns an express app instance suitable for testing
 */
export const testApp = testEnv.environment === "staging"
  ? process.env.API_ENDPOINT
  : (() => {
    const app = createApp()
    testEnv.environment === "dev" && addTestAuth(app)
    addRoutes(app, testEnv)
    return app
  })()

const createTestUser = (): RegisterUserRequest => {
  return ({
    id: randomUUID(),
    name: faker.name.firstName(),
    handle: `handle${Math.floor(Math.random() * 9999)}` // TODO: find better handle generator
  })
}

const createTestUsers = (users: number) => {
  const result = []

  for (let i = 0; i < users; i++) {
    result.push(createTestUser())
  }

  return result
}

export const testUsers = createTestUsers(10)

export const testUserIdentifier = testEnv.environment === "staging" ? `Bearer ${process.env.USER_TOKEN!}` : randomUUID()

const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude()),
  longitude: parseFloat(faker.address.longitude())
})

const createTestEvent = (): CreateEventInput => {
  const startDate = Math.floor(Math.random() * 1000)
  const endDate = startDate + 10000
  return ({
    title: faker.word.noun(),
    description: faker.animal.rodent(),
    startTimestamp: new Date(startDate),
    endTimestamp: new Date(endDate),
    color: "#72B01D",
    shouldHideAfterStartDate: true,
    isChatEnabled: true,
    ...mockLocationCoordinate2D()
  })
}

const createTestEvents = (events: number) => {
  const result = []

  for (let i = 0; i < events; i++) {
    result.push(createTestEvent())
  }

  return result
}

export const testEvents = createTestEvents(10)
