import { AdminUpdateUserAttributesRequest, CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider"
import { envVars, failure, promiseResult, success } from "TiFBackendUtils"

const cognito = new CognitoIdentityProvider()

// TODO: Need retry mechanism
export const setProfileCreatedAttribute = (userId: string) => {
  const verifyEmailParams: AdminUpdateUserAttributesRequest =
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
    cognito.adminUpdateUserAttributes(verifyEmailParams)
      .then((val) =>
        success(val)
      )
      .catch(err => { console.error(err); return failure(err) })
  )
}
