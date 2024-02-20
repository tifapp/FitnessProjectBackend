/* eslint-disable import/extensions */ // Due to jest setup
import { faker } from "@faker-js/faker"
import AWS from "aws-sdk"
import { envVars } from "../env"
import { TestUser, TestUserInput } from "../global"
import { testEnvVars } from "./testEnv"

AWS.config.update({
  region: envVars.AWS_REGION,
  accessKeyId: envVars.AWS_ACCESS_KEY_ID,
  secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY
})

const cognito = new AWS.CognitoIdentityServiceProvider()

export const createCognitoAuthToken = async (
  user?: TestUserInput
): Promise<TestUser> => {
  const name = user?.name ?? faker.name.fullName()
  const email = faker.internet.email()
  const password = "P@$$W0Rd"

  const signUpParams: AWS.CognitoIdentityServiceProvider.SignUpRequest = {
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

  const signUpResult = await cognito.signUp(signUpParams).promise()

  const adminConfirmSignUpParams: AWS.CognitoIdentityServiceProvider.AdminConfirmSignUpRequest =
    {
      UserPoolId: envVars.COGNITO_USER_POOL_ID ?? "",
      Username: email
    }

  await cognito.adminConfirmSignUp(adminConfirmSignUpParams).promise()

  const verifyEmailParams: AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesRequest =
    {
      UserPoolId: envVars.COGNITO_USER_POOL_ID ?? "",
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

  await cognito.adminUpdateUserAttributes(verifyEmailParams).promise().catch(err => { console.error(err); throw new Error(err) })

  const signInParams: AWS.CognitoIdentityServiceProvider.InitiateAuthRequest = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  }

  const authResult = await cognito.initiateAuth(signInParams).promise()
  const idToken = authResult.AuthenticationResult?.IdToken
  const refreshToken = authResult.AuthenticationResult?.RefreshToken

  if (!idToken || !refreshToken) {
    throw new Error("Failed to authenticate and obtain tokens")
  }

  // try a testUser class to update the state
  const refreshAuth = async () => {
    const refreshParams: AWS.CognitoIdentityServiceProvider.InitiateAuthRequest = {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: testEnvVars.COGNITO_CLIENT_APP_ID ?? "",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }

    const newAuthResult = await cognito.initiateAuth(refreshParams).promise()
    const newIdToken = newAuthResult.AuthenticationResult?.IdToken

    if (!newIdToken) {
      throw new Error("Failed to refresh token and obtain new idToken")
    }

    return `Bearer ${newIdToken}`
  }

  return { auth: `Bearer ${idToken}`, id: signUpResult.UserSub, name, refreshAuth }
}
