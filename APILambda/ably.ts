import Ably from 'ably'
import { insertEvent } from "./events";

const rest = new Ably.Rest({ key: process.env.ABLY_KEY });

type Permissions = Ably.Types.capabilityOp

export const createTokenRequest = async (permissions: Permissions, userId: string) => {
  return new Promise((resolve, reject) => {
    rest.auth.createTokenRequest({ clientId: userId, capability: JSON.stringify(permissions) }, null, (err, tokenRequest) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokenRequest);
      }
    });
  });
}