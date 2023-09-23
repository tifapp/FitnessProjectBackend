import { ZodUtils } from "./Zod"

/**
 * A class representing a valid user handle string.
 */
export class UserHandle {
  readonly rawValue: string

  private constructor (rawValue: string) {
    this.rawValue = rawValue
  }

  /**
   * Formats this handle by prefixing the string with an "@".
   */
  toString () {
    return `@${this.rawValue}`
  }

  static schema = ZodUtils.createOptionalParseableSchema(UserHandle)

  private static REGEX = /^[A-Za-z0-9_]{1,15}$/

  /**
   * Validates a raw user handle string and returns an instance of this
   * class if the handle is valid.
   *
   * A valid user handle is similar to a twitter handle.
   * In this case, the handle is not required to be prefixed with an "@", but
   * it must only contain alphanumeric characters and underscores. It also
   * must be less than 15 characters.
   *
   * @param rawValue the raw user handle string to validate
   * @returns an {@link UserHandle} instance if successful.
   */
  static parse (rawValue: string) {
    return UserHandle.REGEX.test(rawValue)
      ? new UserHandle(rawValue)
      : undefined
  }
}
