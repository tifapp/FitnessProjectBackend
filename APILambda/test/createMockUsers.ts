/* eslint-disable import/extensions */ // Due to jest setup
import { faker } from "@faker-js/faker"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { TestUser } from "../global"
import { envVars } from "TiFBackendUtils/env"
import { v7 as uuidv7 } from "uuid"

const randomUserHandle = () => {
  return uuidv7().replace("-", "_").substring(0, 15)
}

export const createMockAuthToken = async (): Promise<TestUser> => {
  const id = randomUUID()
  const name = faker.name.fullName()

  const tokenPayload = {
    id,
    name,
    handle: randomUserHandle()
  }

  const token = jwt.sign(tokenPayload, envVars.JWT_SECRET)

  return {
    auth: `Bearer ${token}`,
    id,
    name
  }
}
