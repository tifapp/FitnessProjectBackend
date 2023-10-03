import { faker } from "@faker-js/faker"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { addRoutes, createApp } from "../app.js"
import { AuthClaims, addCognitoTokenVerification } from "../auth.js"
import { conn } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"
import { CreateEventInput } from "../events/index.js"
import { RegisterUserRequest } from "../user/SQL.js"

export const testEnv: ServerEnvironment = {
  // use env vars
  environment: process.env.USER_TOKEN ? "staging" : "dev",
  conn
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
    addCognitoTokenVerification(app, testEnv)
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

export const testUsers: RegisterUserRequest[] = createTestUsers(10)

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

export const mockClaims: AuthClaims = {
  sub: randomUUID(),
  name: "John Doe",
  email: "john.doe@example.com",
  // properties taken from cognito
  // eslint-disable-next-line @typescript-eslint/naming-convention
  email_verified: true,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  phone_number: "+1234567890",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  phone_number_verified: true
}

export const generateMockAuthorizationHeader = (claims: Partial<AuthClaims>) => {
  const secret = "supersecret"

  const tokenPayload = { ...mockClaims, ...claims }

  if (!("sub" in claims)) {
    tokenPayload.sub = randomUUID()
  }

  const token = jwt.sign(tokenPayload, secret, { algorithm: "HS256" })

  return `Bearer ${token}`
}

export const mockToken = generateMockAuthorizationHeader(mockClaims)

export const testAuthorizationHeader = process.env.USER_TOKEN ?? mockToken