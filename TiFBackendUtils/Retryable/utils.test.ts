import { immediateRetryFunction } from "./utils"

describe("retryFunction", () => {
  test("Should not retry if function succeeds", async () => {
    const successfulFunction = jest.fn().mockResolvedValue("success")
    const retriedFunction = immediateRetryFunction(successfulFunction, 3)

    const result = await retriedFunction(undefined)

    expect(successfulFunction).toHaveBeenCalledTimes(1)
    expect(result).toBe("success")
  })

  test("Should retry up to maxRetries times if function fails", async () => {
    const failingFunction = jest.fn().mockRejectedValue(new Error("failure"))

    const retriedFunction = immediateRetryFunction(failingFunction, 3)

    await expect(retriedFunction(undefined)).rejects.toThrow("Failed after 3 attempts")

    expect(failingFunction).toHaveBeenCalledTimes(3)
  })

  test("Should succeed on a retry if the function eventually succeeds", async () => {
    const failingThenSucceedingFunction = jest
      .fn()
      .mockRejectedValueOnce(new Error("failure"))
      .mockResolvedValue("success")

    const retriedFunction = immediateRetryFunction(failingThenSucceedingFunction, 3)

    const result = await retriedFunction(undefined)

    expect(failingThenSucceedingFunction).toHaveBeenCalledTimes(2)
    expect(result).toBe("success")
  })
})
