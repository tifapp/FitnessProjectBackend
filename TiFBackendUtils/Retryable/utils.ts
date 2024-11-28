export type Retryable = <T, U>(asyncFn: (event: T) => Promise<U>, maxRetries: number) => ((event: T) => Promise<U>)

export const immediateRetryFunction: Retryable = <T, U>(
  asyncFn: (event: T) => Promise<U>,
  maxRetries: number = 3
): ((event: T) => Promise<U>) => {
  return async (event: T): Promise<U> => {
    let attempt = 0

    while (attempt < maxRetries) {
      attempt++
      try {
        return await asyncFn(event)
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error)
        if (attempt >= maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts`)
        }
      }
    }

    throw new Error("Exhausted all retries without success")
  }
}
