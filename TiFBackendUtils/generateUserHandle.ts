import { UserHandle } from "TiFShared/domain-models/User"
import { PromiseResult, failure } from "TiFShared/lib/Result"
import crypto from "crypto"
import { conn } from "."
import { userWithHandleDoesNotExist } from "./TiFUserUtils"

const generateNumericHash = (input: string) => {
  const hash = crypto.createHash("sha1").update(input).digest("hex")
  const numericHash = BigInt(`0x${hash}`) % BigInt(1e4)
  return numericHash.toString().padStart(4, "0")
}

const generateUniqueUsernameAttempt = (
  name: string,
  retries: number,
  isHandleNotTaken: (
    _: UserHandle
  ) => ReturnType<typeof userWithHandleDoesNotExist>
): PromiseResult<UserHandle, "could-not-generate-username"> => {
  const potentialUsername = UserHandle.optionalParse(
    `${name}${generateNumericHash(`${name}${Date.now()}`)}`
  )!

  return isHandleNotTaken(potentialUsername)
    .withSuccess(potentialUsername)
    .flatMapFailure(() =>
      retries > 0
        ? generateUniqueUsernameAttempt(name, retries - 1, isHandleNotTaken)
        : failure("could-not-generate-username" as const)
    )
}

const sanitizeName = (name: string) => {
  let cleanedName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  cleanedName = cleanedName.length ? cleanedName : "idk"
  return cleanedName.substr(0, 11)
}

export const generateUniqueHandle = (
  name: string,
  retries = 3,
  isHandleNotTaken = (handle: UserHandle) =>
    userWithHandleDoesNotExist(conn, handle)
) => {
  return generateUniqueUsernameAttempt(
    sanitizeName(name),
    retries,
    isHandleNotTaken
  )
}
