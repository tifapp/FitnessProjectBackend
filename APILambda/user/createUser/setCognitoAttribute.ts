import { failure, promiseResult, success } from "TiFBackendUtils"
import AWS from "aws-sdk"

const cognito = new AWS.CognitoIdentityServiceProvider()

// TODO: Need retry mechanism
export const setProfileCreatedAttribute = (userId: string) => {
  console.log("about to set the user's profile_created attribute to true for the user ", userId)

  const verifyEmailParams: AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesRequest =
    {
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      Username: userId,
      UserAttributes: [
        {
          Name: "custom:profile_created",
          Value: "true"
        }
      ]
    }

  return promiseResult(
    cognito.adminUpdateUserAttributes(verifyEmailParams).promise()
      .then((val) =>
        success(val)
      )
      .catch(err => { console.error(err); return failure(err) })
  )
}
