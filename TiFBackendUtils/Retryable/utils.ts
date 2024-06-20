export const retryFunction = <T, U>(
  asyncFn: (event: T) => Promise<U>,
  maxRetries: number = 3,
  retryFn: (asyncFn: (event: T) => Promise<U>, event: T, retriesLeft: number) => Promise<U> 
    = async (asyncFn, event, retriesLeft) => {
      for (let attempt = 1; attempt <= retriesLeft; attempt++) {
        try {
          return await asyncFn(event);
        } catch (e) {
          console.error(`Attempt ${attempt} failed:`, e);
          if (attempt === retriesLeft) {
            throw new Error(`Failed after ${retriesLeft} attempts`);
          }
        }
      }
      throw new Error(`Exhausted all retries without success`);
    }
): ((event: T) => Promise<U>) => {
  return async (event: T): Promise<U> => {
    try {
      return await asyncFn(event);
    } catch (e) {
      console.error(e);
      return retryFn(asyncFn, event, maxRetries);
    }
  };
};
