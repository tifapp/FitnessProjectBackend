/* eslint-disable import/extensions */ // Due to jest setup
import { faker } from "@faker-js/faker"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { AuthClaims } from "../auth"
import { TestUser, TestUserInput } from "../global.d"

export const createMockAuthToken = async (
  user?: Partial<TestUserInput>
): Promise<TestUser> => {
  const secret = "supersecret"
  const id = randomUUID()

  const tokenPayload: AuthClaims = {
    sub: id,
    name: user?.name ?? faker.name.fullName(),
    email: faker.internet.email(),
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    phone_number: faker.phone.imei(),
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    email_verified: user?.isVerified ?? true,
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    phone_number_verified: user?.isVerified ?? true
  }

  const token = jwt.sign(tokenPayload, secret, { algorithm: "HS256" })

  return { auth: `Bearer ${token}`, id }
}
