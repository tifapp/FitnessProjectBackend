/* eslint-disable import/extensions */ // Due to jest setup
import { faker } from "@faker-js/faker"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { AuthClaims } from "../auth"
import { TestUser } from "../global"
import { RegisterUserRequest } from "../user/SQL"

const generateMockAuthorizationHeader = (user: RegisterUserRequest) => {
  const secret = "supersecret"

  const tokenPayload: AuthClaims = {
    sub: user.id,
    name: user.name,
    email: faker.internet.email(),
    phone_number: faker.phone.imei(),
    email_verified: true,
    phone_number_verified: true
  }

  const token = jwt.sign(tokenPayload, secret, { algorithm: "HS256" })

  return `Bearer ${token}`
}

const createMockUser = (): TestUser => {
  const user = {
    id: randomUUID(),
    name: faker.name.fullName(),
    handle: `handle${Math.floor(Math.random() * 9999)}` // TODO: find better handle generator
  }

  return ({ profile: user, authorization: generateMockAuthorizationHeader(user) })
}

// do not use directly, use global.users in tests
export const createMockUsers = (users: number) => {
  const result = []

  for (let i = 0; i < users; i++) {
    result.push(createMockUser())
  }

  return result
}
