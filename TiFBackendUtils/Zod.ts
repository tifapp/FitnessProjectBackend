import { ZodTypeAny, z } from "zod"

/**
 * An interface which defines a method of parsing that returns either an output type or `undefined`.
 */
export interface OptionalParseable<Input, Output> {
  parse(input: Input): Output | undefined
}
// TODO: FIX
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ZodUtils {
  /**
   * Creates a zod schema from an object which comforms to the {@link OptionalParseable} interface.
   *
   * This is mostly useful for createing Zod Schemas for rich doamin types like {@link UserHandle},
   * which take in a string input, but want an output of themself.
   *
   * Ex.
   * ```ts
   * class UserHandle {
   *   static parse (rawValue: string): UserHandle | undefined {
   *     // Validate that the string is indeed a user handle then return the user handle if so else undefined. ...
   *   }
   *
   *   static schema = ZodUtils.createOptionalParseableSchema(UserHandle)
   * }
   * ```
   *
   * @param parseable see {@link OptionalParseable}
   * @param errorMessage a function that gets the error message when parsing fails.
   * @returns a zod schema that wraps the parseable.
   */
  export const createOptionalParseableSchema = <Input, Output>(
    parseable: OptionalParseable<Input, Output>,
    errorMessage: () => string = () => "Failure: undefined"
  ): ZodTypeAny => {
    let parsedValue: Output | undefined
    return z
      .custom<Input>()
      .superRefine((arg, ctx) => {
        parsedValue = parseable.parse(arg)
        if (!parsedValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: errorMessage(),
            fatal: true
          })
        }
      })
      .transform(() => parsedValue!)
  }
}
