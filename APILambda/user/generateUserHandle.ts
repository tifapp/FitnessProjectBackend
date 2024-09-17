import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { userWithHandleDoesNotExist } from "TiFBackendUtils/TiFUserUtils"
import { UserHandle } from "TiFShared/domain-models/User"
import { PromiseResult, failure } from "TiFShared/lib/Result"
import crypto from "crypto"

const generateNumericHash = (input: string) => {
  const hash = crypto.createHash("sha1").update(input).digest("hex")
  // Convert hex hash to a BigInt and then take modulus to get a fixed size numeric hash
  const numericHash = BigInt(`0x${hash}`) % BigInt(1e4) // using a 5-digit number for simplicity
  return numericHash.toString().padStart(4, "0")
}

// make retry function util?
const generateUniqueUsernameAttempt = (conn: MySQLExecutableDriver, name: string, retries: number): PromiseResult<UserHandle, "could-not-generate-username"> => {
  const potentialUsername = UserHandle.optionalParse(`${name}${generateNumericHash(
    `${name}${Date.now()}`
  )}`)!
  return userWithHandleDoesNotExist(conn, potentialUsername)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Retry function
    .withSuccess(potentialUsername)
    .flatMapFailure(() => retries > 0 ? generateUniqueUsernameAttempt(conn, name, retries - 1) : failure("could-not-generate-username" as const))
}

export const generateUniqueHandle = (
  conn: MySQLExecutableDriver,
  name: string,
  retries = 3
) => {
  let cleanedName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  cleanedName = cleanedName.length ? cleanedName : "idk"
  const baseName = cleanedName.substr(0, 11)

  return generateUniqueUsernameAttempt(conn, baseName, retries)
}
