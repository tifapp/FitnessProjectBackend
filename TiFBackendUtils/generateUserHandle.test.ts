import "TiFShared/lib/Zod"

import { UserHandle } from "TiFShared/domain-models/User"
import { failure, promiseResult, success } from "TiFShared/lib/Result"
import { generateUniqueHandle } from "./generateUserHandle"

describe("generateUniqueHandle", () => {
  const handles: UserHandle[] = []
  const isHandleTaken = (generatedHandle: UserHandle) => {
    if (
      !handles.find((handle) => handle.rawValue === generatedHandle.rawValue)
    ) {
      handles.push(generatedHandle)
      return promiseResult(success(false as const))
    } else {
      return promiseResult(failure("duplicate-handle" as const))
    }
  }

  const handleIsTaken = () =>
    promiseResult(failure("duplicate-handle" as const))

  it("should generate unique usernames if username already exists", async () => {
    const username1 = await generateUniqueHandle("John Doe", 0, isHandleTaken)
    const username2 = await generateUniqueHandle("John Doe", 0, isHandleTaken)
    expect(username1).not.toEqual(username2)
  })

  it("should clean name properly", async () => {
    const username = await generateUniqueHandle("J@hn D0e!!!", 0, isHandleTaken)
    expect(JSON.stringify(username.value).substr(1, 6)).toEqual("jhnd0e")
    expect(JSON.stringify(username.value).slice(0, -1).substr(7)).toMatch(
      /^\d{4}$/
    )
  })

  it("should produce a handle starting with 'idk' if name has 0 valid characters", async () => {
    const username = await generateUniqueHandle("@ !!!", 0, isHandleTaken)
    expect(JSON.stringify(username.value).substr(1, 3)).toEqual("idk")
    expect(JSON.stringify(username.value).slice(0, -1).substr(4)).toMatch(
      /^\d{4}$/
    )
  })

  it("should return failure after max retries", async () => {
    const result = await generateUniqueHandle("John Doe", 3, handleIsTaken)

    expect(result).toEqual(failure("could-not-generate-username"))
  })
})
