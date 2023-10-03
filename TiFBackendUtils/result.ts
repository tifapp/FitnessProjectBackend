export class SuccessResult<Success> {
  status = "success" as const
  constructor (public value: Success) { this.value = value }
}

export class FailureResult<Failure> {
  status = "failure" as const
  constructor (public value: Failure) { this.value = value }
}

/**
 * A union type that represents either the case of a success or an error.
 *
 * @example
 * ```ts
 * // Usage when returning from a function
 * const registerNewUser = async (
 *   conn: Connection,
 *   request: RegisterUserRequest
 * ): Promise<
 *   Result<{ id: string }, "user-already-exists" | "duplicate-handle">
 * > => {
 *   return await conn.transaction(async (tx) => {
 *     if (await userWithIdExists(tx, request.id)) {
 *       return { status: "error", value: "user-already-exists" };
 *     }
 *
 *    if (await userWithHandleExists(tx, request.handle)) {
 *       return { status: "error", value: "duplicate-handle" };
 *     }
 *
 *     await insertUser(tx, request);
 *     return { status: "success", value: { id: request.id } };
 *   });
 * };
 *
 * // Usage when consuming the function
 * const result = await registerNewUser(...)
 *
 * if (result.status === "success") {
 *   console.log(result.value.id) // Logs some user id
 * } else {
 *   console.log(result.value) // Logs either "user-already-exists" or "duplicate-handle"
 * }
 * ```
 */
export type Result<Success, Failure> =
| SuccessResult<Success>
| FailureResult<Failure>;

// try a mondaic class
