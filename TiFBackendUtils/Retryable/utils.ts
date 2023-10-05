import { scheduleAWSLambda } from "../AWS/lambdaUtils.js"

export interface Retryable {
  retries?: number
}

/**
 * Wraps a lambda function to add exponential backoff retry logic.
 *
 * @param {function} lambdaFunction The lambda function to wrap. This function should be asynchronous and throw an error if the operation it performs fails.
 * @param {number} maxRetries The maximum number of retries before the error is rethrown.
 * @returns {function} A new function that performs the same operation as the original function, but with exponential backoff retries.
 */
export const exponentialFunctionBackoff = <T extends Retryable, U>(
  asyncFunc: (event: T) => Promise<U>,
  maxRetries: number = 3,
  retryAsyncFunc = scheduleAWSLambda // parameterized for testing
) => { // retryAsync: (date, T) => U
  return async (event: T) => {
    try {
      return await asyncFunc(event)
    } catch (e) {
      console.error(e)
      const retries = (event.retries ?? 0)
      if (retries < maxRetries) {
        const retryDelay = Math.pow(2, retries)
        const retryDate = new Date()
        retryDate.setHours(retryDate.getHours() + retryDelay)

        const newEvent = { ...event, retries: retries + 1 }
        return retryAsyncFunc(retryDate.toISOString(), newEvent)
      } else {
        throw e
      }
    }
  }
}
