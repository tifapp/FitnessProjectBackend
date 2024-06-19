import { deleteEventBridgeRule, scheduleAWSLambda } from "../AWS/lambdaUtils.js"
import { envVars } from "../env.js"

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
  retryAsyncFunc = envVars.ENVIRONMENT === "devTest" ? () => {} : scheduleAWSLambda,
  cleanup = envVars.ENVIRONMENT === "devTest" ? () => {} : deleteEventBridgeRule
) => {
  // retryAsync: (date, T) => U
  return async (event: T) => {
    const parsedEvent = typeof event === "string" ? JSON.parse(event) : event // event may be received as a string when triggered with lambda.invoke()?
    try {
      await cleanup(parsedEvent)
      return await asyncFunc(parsedEvent.detail)
    } catch (e) {
      console.error(e)
      const retries = parsedEvent.detail.retries ?? 0
      if (retries < maxRetries) {
        const retryDelay = Math.pow(2, retries)
        const retryDate = new Date()
        retryDate.setHours(retryDate.getHours() + retryDelay)

        const newEvent = { ...parsedEvent, retries: retries + 1 }
        return retryAsyncFunc(retryDate.toISOString(), newEvent)
      } else {
        throw e
      }
    }
  }
}
