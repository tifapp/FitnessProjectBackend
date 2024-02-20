import { failure, promiseResult, success } from "TiFBackendUtils"
import AWS from "aws-sdk"
import { envVars } from "../../env.js"

const cognito = new AWS.CognitoIdentityServiceProvider()

// TODO: Need retry mechanism
export const setProfileCreatedAttribute = (userId: string) => {
  const verifyEmailParams: AWS.CognitoIdentityServiceProvider.AdminUpdateUserAttributesRequest =
    {
      UserPoolId: envVars.COGNITO_USER_POOL_ID,
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
