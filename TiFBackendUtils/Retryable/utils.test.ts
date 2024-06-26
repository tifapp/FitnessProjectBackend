import { retryFunction } from "./utils.js";

describe("retryFunction", () => {
  test("Should not retry if function succeeds", async () => {
    const successfulFunction = jest.fn().mockResolvedValue("success");
    const retriedFunction = retryFunction(successfulFunction, 3);

    const result = await retriedFunction(undefined);

    expect(successfulFunction).toHaveBeenCalledTimes(1);
    expect(result).toBe("success");
  });

  test("Should retry up to maxRetries times if function fails", async () => {
    const failingFunction = jest.fn().mockRejectedValue(new Error("failure"));

    const mockRetryFn = jest.fn().mockImplementation(
      async (asyncFn, event, retriesLeft) => {
        if (retriesLeft <= 0) {
          throw new Error("failure");
        }
        return retryFunction(asyncFn, retriesLeft - 1, mockRetryFn)(event);
      }
    );

    const retriedFunction = retryFunction(failingFunction, 2, mockRetryFn);

    try {
      await retriedFunction(undefined);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      expect(failingFunction).toHaveBeenCalledTimes(3);
      expect(e.message).toBe("failure");
    }
  });
});
