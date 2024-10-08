/* eslint-disable import/extensions */ // Due to jest setup
import { AdminConfirmSignUpRequest, AdminUpdateUserAttributesRequest, CognitoIdentityProvider, InitiateAuthRequest, SignUpRequest } from "@aws-sdk/client-cognito-identity-provider"
import { fromEnv } from "@aws-sdk/credential-providers"
import { faker } from "@faker-js/faker"
import jwt from "jsonwebtoken"
import { envVars } from "TiFBackendUtils/env"
import { TestUser, TestUserInput } from "../global"
import { testEnvVars } from "./testEnv"

const cognito = new CognitoIdentityProvider({
  credentials: fromEnv()
})

export const createCognitoAuthToken = async (
  user?: TestUserInput
): Promise<TestUser> => {
  const name = user?.name ?? faker.name.fullName()
  const email = faker.internet.email()
  const password = "P@$$W0Rd"

  const signUpParams: SignUpRequest = {
    ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "name",
        Value: name
      }
    ]
  }

  const signUpResult = await cognito.signUp(signUpParams)

  const adminConfirmSignUpParams: AdminConfirmSignUpRequest =
    {
      UserPoolId: testEnvVars.COGNITO_USER_POOL_ID ?? "",
      Username: email
    }

  await cognito.adminConfirmSignUp(adminConfirmSignUpParams)

  const verifyEmailParams: AdminUpdateUserAttributesRequest =
    {
      UserPoolId: testEnvVars.COGNITO_USER_POOL_ID ?? "",
      Username: email,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: `${user?.isVerified ?? true}`
        },
        {
          Name: "custom:profile_created",
          Value: user?.profileExists === true ? "true" : "false"
        }
      ]
    }

  console.log("creating the user and about to set the user's profile_created attribute to true for the user ", email)

  await cognito.adminUpdateUserAttributes(verifyEmailParams).catch(err => { console.error(err); throw new Error(err) })

  const signInParams: InitiateAuthRequest = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  }

  const authResult = await cognito.initiateAuth(signInParams)
  const idToken = authResult.AuthenticationResult?.IdToken
  const refreshToken = authResult.AuthenticationResult?.RefreshToken

  if (!idToken || !refreshToken) {
    throw new Error("Failed to authenticate and obtain tokens")
  }

  if (!signUpResult.UserSub) {
    throw new Error("Failed to create user id")
  }

  // try a testUser class to update the state
  const refreshAuth = async () => {
    const refreshParams: InitiateAuthRequest = {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }

    const newAuthResult = await cognito.initiateAuth(refreshParams)
    const newIdToken = newAuthResult.AuthenticationResult?.IdToken

    if (!newIdToken) {
      throw new Error("Failed to refresh token and obtain new idToken")
    }

    return `Bearer ${newIdToken}`
  }

  return { auth: `Bearer ${idToken}`, id: signUpResult.UserSub, name, refreshAuth }
}

const users = ["Luna61@yahoo.com", "Wiley_Wintheiser30@yahoo.com", "Ali38@yahoo.com", "Kianna5@gmail.com", "Jerrell.Ward52@gmail.com", "Gayle.DuBuque56@gmail.com", "Sylvia_Walter68@gmail.com", "Percival_Jacobson46@hotmail.com", "Amara69@yahoo.com", "Else_Keebler@hotmail.com", "Toby.Dickens@yahoo.com", "Kayden.Kassulke@gmail.com"]
const counter = { currentUserIndex: 0 }

export const createCognitoTestAuthToken = async ( // TODO: Remove after we get company email so we can have unlimited test users

): Promise<TestUser> => {
  if (counter.currentUserIndex >= users.length) {
    throw new Error("used all test user emails")
  }

  const signInParams: InitiateAuthRequest = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
    AuthParameters: {
      USERNAME: users[counter.currentUserIndex],
      PASSWORD: "P@$$W0Rd"
    }
  }

  counter.currentUserIndex++

  const authResult = await cognito.initiateAuth(signInParams)
  const idToken = authResult.AuthenticationResult?.IdToken
  const refreshToken = authResult.AuthenticationResult?.RefreshToken

  if (!idToken || !refreshToken) {
    throw new Error("Failed to authenticate and obtain tokens")
  }

  // try a testUser class to update the state
  const refreshAuth = async () => {
    const refreshParams: InitiateAuthRequest = {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }

    const newAuthResult = await cognito.initiateAuth(refreshParams)
    const newIdToken = newAuthResult.AuthenticationResult?.IdToken

    if (!newIdToken) {
      throw new Error("Failed to refresh token and obtain new idToken")
    }

    return `Bearer ${newIdToken}`
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { payload: { sub, name } } = jwt.decode(idToken, { complete: true })

  return { auth: `Bearer ${idToken}`, id: sub as string, name, refreshAuth }
}
