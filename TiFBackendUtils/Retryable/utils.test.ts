import { exponentialFunctionBackoff } from "./utils";

describe("exponentialFunctionBackoff", () => {
  test("Should not retry if lambda function succeeds", async () => {
    const successfulLambdaFunction = jest.fn().mockResolvedValue('success');
    const result = await exponentialFunctionBackoff(successfulLambdaFunction, 3)({retries: 0});
    expect(successfulLambdaFunction).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });

  test("Should retry up to maxRetries times if lambda function fails", async () => {
    const failingLambdaFunction = jest.fn().mockRejectedValue(new Error('failure'));
    
    let wrappedFunction: (event: any) => Promise<any>; // Placeholder for the wrapped function

    const mockScheduleLambda = jest.fn().mockImplementation((eventTime, event) => {
      return wrappedFunction(event);
    });
    
    wrappedFunction = exponentialFunctionBackoff(failingLambdaFunction, 2, mockScheduleLambda);

    try {
      await wrappedFunction({retries: 0});
    } catch (e: any) {
      expect(failingLambdaFunction).toHaveBeenCalledTimes(3);
      expect(e.message).toBe('failure');
    }
  });
});