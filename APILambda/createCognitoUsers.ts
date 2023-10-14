import { faker } from "@faker-js/faker"
import AWS from "aws-sdk"
import { TestUser, TestUserInput } from "./global.d"

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

const cognito = new AWS.CognitoIdentityServiceProvider()

export const createCognitoAuthToken = async (user?: TestUserInput): Promise<TestUser> => {
  const name = user?.name ?? faker.name.fullName()
  const email = faker.internet.email()
  const password = "P@$$W0Rd"

  const signUpParams: AWS.CognitoIdentityServiceProvider.SignUpRequest = {
    ClientId: process.env.COGNITO_CLIENT_APP_ID ?? "",
    Username: email,
    Password: password,
    UserAttributes: [{
      Name: "name",
      Value: name
    }]
  }

  const signUpResult = await cognito.signUp(signUpParams).promise()

  const verifyEmailParams: AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesRequest = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
    Username: email,
    UserAttributes: [
      {
        Name: "email_verified",
        Value: `${user?.isVerified ?? true}`
      }
    ]
  }

  await cognito.adminUpdateUserAttributes(verifyEmailParams).promise()

  const signInParams: AWS.CognitoIdentityServiceProvider.InitiateAuthRequest = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: process.env.COGNITO_CLIENT_APP_ID ?? "",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  }

  const authResult = await cognito.initiateAuth(signInParams).promise()
  const idToken = authResult.AuthenticationResult?.IdToken

  if (!idToken) {
    throw new Error("Failed to authenticate and obtain idToken")
  }

  return ({ auth: `Bearer ${idToken}`, id: signUpResult.UserSub })
}
