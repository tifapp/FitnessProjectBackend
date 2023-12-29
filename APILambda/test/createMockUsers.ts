/* eslint-disable import/extensions */ // Due to jest setup
import { faker } from "@faker-js/faker"
import { randomUUID } from "crypto"
import jwt from "jsonwebtoken"
import { AuthClaims } from "../auth"
import { TestUser, TestUserInput } from "../global"

export const createMockAuthToken = async (
  user?: Partial<TestUserInput>
): Promise<TestUser> => {
  const secret = "supersecret"
  const id = randomUUID()
  const email = faker.internet.email()
  const name = faker.name.fullName()

  const tokenPayload: AuthClaims = {
    sub: id,
    name: user?.name ?? name,
    email,
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
    "custom:profile_created": user?.profileExists === true ? "true" : undefined
  }

  const token = jwt.sign(tokenPayload, secret, { algorithm: "HS256" })

  const updateClaimsAndRefreshAuth = async () => {
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    )
    claims["custom:profile_created"] = "true"

    const newToken = jwt.sign(claims, "supersecret", { algorithm: "HS256" })

    return `Bearer ${newToken}`
  }

  return { auth: `Bearer ${token}`, id, name, refreshAuth: updateClaimsAndRefreshAuth }
}
