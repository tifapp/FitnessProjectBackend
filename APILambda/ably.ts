import Ably from "ably"

const rest = new Ably.Rest({ key: process.env.ABLY_KEY })

export type ChatPermissions = Exclude<Ably.Types.TokenParams["capability"], string | undefined>
export type AblyTokenRequest = Ably.Types.TokenRequest

export const createTokenRequest = async (permissions: ChatPermissions, userId: string): Promise<Ably.Types.TokenRequest> => {
  // use ably.rest.promise api
  return new Promise((resolve, reject) => {
    rest.auth.createTokenRequest({ clientId: userId, capability: JSON.stringify(permissions) }, null, (err, tokenRequest) => {
      if (err) {
        reject(err)
      } else if (!tokenRequest) {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject("Could not generate tokenRequest")
      } else {
        resolve(tokenRequest)
      }
    })
  })
}
