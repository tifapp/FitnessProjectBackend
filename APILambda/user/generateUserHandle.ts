import { MySQLExecutableDriver, userWithHandleDoesNotExist } from "TiFBackendUtils"
import { PromiseResult, failure, promiseResult } from "TiFShared/lib/Result.js"
import crypto from "crypto"

const generateNumericHash = (input: string) => {
  const hash = crypto.createHash("sha1").update(input).digest("hex")
  // Convert hex hash to a BigInt and then take modulus to get a fixed size numeric hash
  const numericHash = BigInt(`0x${hash}`) % BigInt(1e4) // using a 5-digit number for simplicity
  return numericHash.toString().padStart(4, "0")
}

// make retry function util?
const generateUniqueUsernameAttempt = (conn: MySQLExecutableDriver, name: string, retries: number): PromiseResult<string, "could-not-generate-username"> => {
  const potentialUsername = `${name}${generateNumericHash(
    `${name}${Date.now()}`
  )}`
  return userWithHandleDoesNotExist(conn, potentialUsername)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Retry function
    .mapSuccess(() => potentialUsername)
    .flatMapFailure(() => retries > 0 ? generateUniqueUsernameAttempt(conn, name, retries - 1) : promiseResult(failure("could-not-generate-username" as const)))
}

export const generateUniqueUsername = (
  conn: MySQLExecutableDriver,
  name: string,
  retries = 3
) => {
  let cleanedName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  cleanedName = cleanedName.length ? cleanedName : "idk"
  const baseName = cleanedName.substr(0, 11)

  return generateUniqueUsernameAttempt(conn, baseName, retries)
}
