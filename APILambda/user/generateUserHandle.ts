import { PromiseResult, SQLExecutable, failure, promiseResult, success } from "TiFBackendUtils"
import crypto from "crypto"
import { userWithHandleExists } from "./SQL.js"

const generateNumericHash = (input: string) => {
  const hash = crypto.createHash("sha1").update(input).digest("hex")
  // Convert hex hash to a BigInt and then take modulus to get a fixed size numeric hash
  const numericHash = BigInt(`0x${hash}`) % BigInt(1e4) // using a 5-digit number for simplicity
  return numericHash.toString().padStart(4, "0")
}

// make retry function util?
const generateUniqueUsernameAttempt = (conn: SQLExecutable, name: string, retries: number): PromiseResult<string, false | void> => {
  const potentialUsername = `${name}${generateNumericHash(
    `${name}${Date.now()}`
  )}`
  return userWithHandleExists(conn, potentialUsername)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Retry function
    .flatMapFailure((error) => promiseResult(retries === 0 ? failure(error) : promiseResult(generateUniqueUsernameAttempt(name, retries - 1))))
    .flatMapSuccess(() => success(potentialUsername))
}

export const generateUniqueUsername = (
  conn: SQLExecutable,
  name: string,
  retries = 3
) => {
  let cleanedName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  cleanedName = cleanedName.length ? cleanedName : "idk"
  const baseName = cleanedName.substr(0, 11)

  return generateUniqueUsernameAttempt(conn, baseName, retries)
}
