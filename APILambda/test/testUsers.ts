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
  const email = faker.internet.email()

  const tokenPayload: AuthClaims = {
    sub: id,
    name: user?.name ?? faker.name.fullName(),
    email,
    username: email,
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    phone_number: faker.phone.imei(),
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    email_verified: user?.isVerified ?? true,
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    phone_number_verified: user?.isVerified ?? true,
    // Comes from Cognito
    // eslint-disable-next-line @typescript-eslint/naming-convention
    profile_created: user?.profileExists ?? false
  }

  const token = jwt.sign(tokenPayload, secret, { algorithm: "HS256" })

  const updateClaimsAndRefreshAuth = async () => {
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    )
    claims.profile_created = true

    const newToken = jwt.sign(claims, "supersecret", { algorithm: "HS256" })

    return `Bearer ${newToken}`
  }

  return { auth: `Bearer ${token}`, id, refreshAuth: updateClaimsAndRefreshAuth }
}
