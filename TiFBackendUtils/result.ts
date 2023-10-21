/* eslint-disable no-use-before-define */

/**
 * A type representing an "expected" success or failure of an operation.
 *
 * The keyword expected means any error that we must handle in some kind of way. Unexpected errors
 * can still be thrown as exceptions, because they are exceptions to what we expect.
 *
 * For instance, an error we could expect is that a particular record in the database does not
 * exist which can be modeled with this type. We don't however, expect that a meteor will destroy
 * the database. That can be handled with a try catch or bubble up a 500 if something goes wrong.
 */
export type Result<Success, Failure> =
  | SuccessResult<Success, Failure>
  | FailureResult<Success, Failure>

export type AnyResult<Success, Failure> =
  | Result<Success, Failure>
  | PromiseResult<Success, Failure>

export type AwaitableResult<Success, Failure> =
  | AnyResult<Success, Failure>
  | Promise<AnyResult<Success, Failure>>

/**
 * A result representing a success of an operation.
 */
export class SuccessResult<Success, Failure> {
  status = "success" as const

  constructor (public value: Success) {
    this.value = value
  }

  /**
   * Given the success value, maps this result into an entirely new result.
   */
  flatMapSuccess<NewSuccess, NewFailure> (
    mapper: (value: Success) => AwaitableResult<NewSuccess, NewFailure>
  ): AnyResult<NewSuccess, Failure | NewFailure> {
    const result = mapper(this.value)
    if (result instanceof PromiseResult || result instanceof Promise) {
      return withPromise(result)
    } else {
      return result
    }
  }

  /**
   * Returns this result typecasted with the success type unioned with the returned success
   * type and failure type from the map function.
   */
  flatMapFailure<NewSuccess, NewFailure> (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: (value: Failure) => AwaitableResult<NewSuccess, NewFailure>
  ) {
    return this as unknown as SuccessResult<Success | NewSuccess, NewFailure>
  }

  /**
   * Maps the current success value into a new one lazily.
   */
  mapSuccess<NewSuccess> (mapper: (value: Success) => NewSuccess) {
    return success(mapper(this.value)) as SuccessResult<NewSuccess, Failure>
  }

  /**
   * Returns this result typecasted with the new failure type returned from the map function.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapFailure<NewFailure> (_: (value: Failure) => NewFailure) {
    return this as unknown as SuccessResult<Success, NewFailure>
  }

  /**
   * Returns this result typecasted with the new failure type.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withFailure<NewFailure> (_: NewFailure) {
    return this as unknown as SuccessResult<Success, NewFailure>
  }

  /**
   * Sets the success value of this type to the given success value eagerly.
   */
  withSuccess<NewSuccess> (value: NewSuccess) {
    return success(value)
  }

  /**
   * Inverts this result to a failure result with the current value being treated as the new error value.
   */
  inverted () {
    return failure(this.value) as FailureResult<Failure, Success>
  }
}

/**
 * A result representing a failure of an operation.
 */
export class FailureResult<Success, Failure> {
  status = "failure" as const

  constructor (public value: Failure) {
    this.value = value
  }

  /**
   * Returns this result typecasted with the error type unioned with the returned error
   * type and success type from the map function.
   */
  flatMapSuccess<NewSuccess, NewFailure> (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: (value: Success) => AwaitableResult<NewSuccess, NewFailure>
  ) {
    return this as unknown as FailureResult<NewSuccess, Failure | NewFailure>
  }

  /**
   * Given the failure value, maps this result into an entirely new result.
   */
  flatMapFailure<NewSuccess, NewFailure> (
    mapper: (value: Failure) => AwaitableResult<NewSuccess, NewFailure>
  ): AnyResult<Success | NewSuccess, NewFailure> {
    const result = mapper(this.value)
    if (result instanceof PromiseResult || result instanceof Promise) {
      return withPromise(result)
    } else {
      return result
    }
  }

  /**
   * Returns this result typecasted with the new success type returned from the map function.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapSuccess<NewSuccess> (_: (value: Success) => NewSuccess) {
    return this as unknown as FailureResult<NewSuccess, Failure>
  }

  /**
   * Maps the current failure value into a new one lazily.
   */
  mapFailure<NewFailure> (mapper: (value: Failure) => NewFailure) {
    return failure(mapper(this.value)) as FailureResult<Success, NewFailure>
  }

  /**
   * Sets the current failure value to a new one eagerly.
   */
  withFailure<NewFailure> (value: NewFailure) {
    return failure(value)
  }

  /**
   * Returns this result typecasted with the new success type.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withSuccess<NewSuccess> (_: NewSuccess) {
    return this as unknown as FailureResult<NewSuccess, Failure>
  }

  /**
   * Inverts this result to a success result with the current value being treated as the new success value.
   */
  inverted () {
    return success(this.value) as SuccessResult<Failure, Success>
  }
}

/**
 * A result that handles a promise to a {@link Result} in a way such that it can be used like a normal synchronous result.
 */
export class PromiseResult<Success, Failure> {
  private readonly promise: Promise<Result<Success, Failure>>

  constructor (result: AwaitableResult<Success, Failure>) {
    if (result instanceof Promise) {
      this.promise = result.then((res) => {
        return res instanceof PromiseResult ? res.wait() : res
      })
    } else if (result instanceof PromiseResult) {
      this.promise = result.promise
    } else {
      this.promise = Promise.resolve(result)
    }
  }

  /**
   * If this result is successful, runs a map function with the success value that transforms this result
   * into a {@link PromiseResult} that manages the underlying result returned from the map function.
   *
   * @param mapper a function to map the success value into a new result.
   */
  flatMapSuccess<NewSuccess, NewFailure> (
    mapper: (value: Success) => AwaitableResult<NewSuccess, NewFailure>
  ): PromiseResult<NewSuccess, Failure | NewFailure> {
    const result = this.promise.then((result) => result.flatMapSuccess(mapper))
    return withPromise(result)
  }

  /**
   * If this result is unsuccessful, runs a map function with the failure value that transforms this result
   * into a {@link PromiseResult} that manages the underlying result returned from the map function.
   *
   * @param mapper a function to map the success value into a new result.
   */
  flatMapFailure<NewSuccess, NewFailure> (
    mapper: (value: Failure) => AwaitableResult<NewSuccess, NewFailure>
  ) {
    const result = this.promise.then((result) => result.flatMapFailure(mapper))
    return withPromise(result)
  }

  /**
   * If this result is successful, runs a function to transform the success value into a new one lazily.
   */
  mapSuccess<NewSuccess> (mapper: (value: Success) => NewSuccess) {
    const result = this.promise.then((result) => result.mapSuccess(mapper))
    return withPromise(result)
  }

  /**
   * If this result is unsuccessful, runs a function to transform the failure value into a new one lazily.
   */
  mapFailure<NewFailure> (mapper: (value: Failure) => NewFailure) {
    const result = this.promise.then((result) => result.mapFailure(mapper))
    return withPromise(result)
  }

  /**
   * If this result is successful, inverts this result into an unsuccessful one and vice-versa.
   */
  inverted () {
    return withPromise(this.promise.then((res) => res.inverted()))
  }

  /**
   * If this result is unsuccessful, sets the new failure value to the given value eagerly.
   */
  withFailure<NewFailure> (value: NewFailure) {
    return withPromise(this.promise.then((result) => result.withFailure(value)))
  }

  /**
   * If this result is successful, sets the new success value to the given value eagerly.
   */
  withSuccess<NewSuccess> (value: NewSuccess) {
    return withPromise(this.promise.then((result) => result.withSuccess(value)))
  }

  /**
   * Returns the promise to the underlying result.
   */
  wait () {
    return this.promise
  }
}

/**
 * Wraps a result into a {@link PromiseResult}.
 */
export const withPromise = <Success, Failure>(
  promise: AwaitableResult<Success, Failure>
) => {
  return new PromiseResult(promise)
}

/**
 * Creates a {@link SuccessResult} with the given value.
 */
export const success = <Success>(value: Success) => {
  return new SuccessResult<Success, never>(value)
}

/**
 * Creates a {@link FailureResult} with the given value.
 */
export const failure = <Failure>(failure: Failure) => {
  return new FailureResult<never, Failure>(failure)
}
