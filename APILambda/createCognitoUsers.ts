import { faker } from "@faker-js/faker"
import AWS from "aws-sdk"
import { TestUser } from "./global.js"
import { RegisterUserRequest } from "./user/SQL.js"

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

const cognito = new AWS.CognitoIdentityServiceProvider()

export const createMockAuthToken = (user: Partial<RegisterUserRequest>) => {
  return `Bearer ${token}`
}

const createCognitoUser = async (email: string, password: string): Promise<TestUser> => {
  const name = faker.name.fullName()

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
        Value: "true"
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

  return {
    profile: {
      id: signUpResult.UserSub,
      name,
      handle: `handle${Math.floor(Math.random() * 9999)}` // TODO: find better handle generator
    },
    authorization: `Bearer ${idToken}`
  }
}

// do not use directly, use global.users in tests
export const createCognitoUsers = async (usersLength: number): Promise<TestUser[]> => {
  const users = []

  for (let i = 0; i < usersLength; i++) {
    const email = faker.internet.email()
    const password = faker.internet.password() // double check requirements
    const user = await createCognitoUser(email, password)
    users.push(user)
  }

  return users
}
