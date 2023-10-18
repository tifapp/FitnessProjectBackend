/* eslint-disable no-use-before-define */

export type Result<Success, Failure> =
  | SuccessResult<Success, Failure>
  | FailureResult<Success, Failure>

export type AnyResult<Success, Failure> =
  | Result<Success, Failure>
  | PromiseResult<Success, Failure>

export type MappedResult<Success, Failure> =
  | AnyResult<Success, Failure>
  | Promise<AnyResult<Success, Failure>>

export class SuccessResult<Success, Failure> {
  status = "success" as const

  constructor (public value: Success) {
    this.value = value
  }

  flatMapSuccess<NewSuccess, NewFailure> (
    mapper: (value: Success) => MappedResult<NewSuccess, NewFailure>
  ): AnyResult<NewSuccess, Failure | NewFailure> {
    const result = mapper(this.value)
    if (result instanceof PromiseResult || result instanceof Promise) {
      return withPromise(result)
    } else {
      return result
    }
  }

  flatMapFailure<NewSuccess, NewFailure> (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: (value: Failure) => MappedResult<NewSuccess, NewFailure>
  ): SuccessResult<Success | NewSuccess, NewFailure> {
    return this as unknown as SuccessResult<Success, NewFailure>
  }

  mapSuccess<NewSuccess> (mapper: (value: Success) => NewSuccess) {
    return success(mapper(this.value)) as SuccessResult<NewSuccess, Failure>
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapFailure<NewFailure> (_: (value: Failure) => NewFailure) {
    return this as unknown as SuccessResult<Success, NewFailure>
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withFailure<NewFailure> (_: NewFailure) {
    return this as unknown as SuccessResult<Success, NewFailure>
  }

  withSuccess<NewSuccess> (value: NewSuccess) {
    return success(value)
  }

  inverted () {
    return failure(this.value) as FailureResult<Failure, Success>
  }
}

export class FailureResult<Success, Failure> {
  status = "failure" as const

  constructor (public value: Failure) {
    this.value = value
  }

  flatMapSuccess<NewSuccess, NewFailure> (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: (value: Success) => MappedResult<NewSuccess, NewFailure>
  ): FailureResult<NewSuccess, Failure | NewFailure> {
    return this as unknown as FailureResult<NewSuccess, Failure>
  }

  flatMapFailure<NewSuccess, NewFailure> (
    mapper: (value: Failure) => MappedResult<NewSuccess, NewFailure>
  ): AnyResult<Success | NewSuccess, NewFailure> {
    const result = mapper(this.value)
    if (result instanceof PromiseResult || result instanceof Promise) {
      return withPromise(result)
    } else {
      return result
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapSuccess<NewSuccess> (_: (value: Success) => NewSuccess) {
    return this as unknown as FailureResult<NewSuccess, Failure>
  }

  mapFailure<NewFailure> (mapper: (value: Failure) => NewFailure) {
    return failure(mapper(this.value)) as FailureResult<Success, NewFailure>
  }

  withFailure<NewFailure> (value: NewFailure) {
    return failure(value)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withSuccess<NewSuccess> (_: NewSuccess) {
    return this as unknown as FailureResult<NewSuccess, Failure>
  }

  inverted () {
    return success(this.value) as SuccessResult<Failure, Success>
  }
}

export class PromiseResult<Success, Failure> {
  private readonly promise: Promise<Result<Success, Failure>>

  constructor (result: MappedResult<Success, Failure>) {
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

  flatMapSuccess<NewSuccess, NewFailure> (
    mapper: (value: Success) => MappedResult<NewSuccess, NewFailure>
  ): PromiseResult<NewSuccess, Failure | NewFailure> {
    const result = this.promise.then((result) => {
      const newResult = result.flatMapSuccess(mapper)
      return newResult instanceof PromiseResult ? newResult.wait() : newResult
    })
    return withPromise(result)
  }

  flatMapFailure<NewSuccess, NewFailure> (
    mapper: (value: Failure) => MappedResult<NewSuccess, NewFailure>
  ) {
    const result = this.promise.then((result) => {
      const newResult = result.flatMapFailure(mapper)
      return newResult instanceof PromiseResult ? newResult.wait() : newResult
    })
    return withPromise(result)
  }

  mapSuccess<NewSuccess> (mapper: (value: Success) => NewSuccess) {
    const result = this.promise.then((result) => result.mapSuccess(mapper))
    return withPromise(result)
  }

  mapFailure<NewFailure> (mapper: (value: Failure) => NewFailure) {
    const result = this.promise.then((result) => result.mapFailure(mapper))
    return withPromise(result)
  }

  inverted () {
    return withPromise(this.promise.then((res) => res.inverted()))
  }

  withFailure<NewFailure> (value: NewFailure) {
    return withPromise(this.promise.then((result) => result.withFailure(value)))
  }

  withSuccess<NewSuccess> (value: NewSuccess) {
    return withPromise(this.promise.then((result) => result.withSuccess(value)))
  }

  wait () {
    return this.promise
  }
}

export const withPromise = <Success, Failure>(
  promise: MappedResult<Success, Failure>
) => {
  return new PromiseResult(promise)
}

export const success = <Success>(value: Success) => {
  return new SuccessResult<Success, never>(value)
}

export const failure = <Failure>(failure: Failure) => {
  return new FailureResult<never, Failure>(failure)
}
