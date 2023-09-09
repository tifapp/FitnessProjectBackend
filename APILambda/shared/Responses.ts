import { Response } from "express"

/**
 * Returns an object that indicates that can be used as the response
 * body when a user is not found.
 *
 * @param userId the id of the user who was not found.
 */
export const userNotFoundBody = (userId: string) => ({
  userId,
  error: "user-not-found"
})

/**
   * Sends a user not found response given a response and user id.
   *
   * @param res the response object to use
   * @param userId the id of the user who was not found.
   */
export const userNotFoundResponse = (res: Response, userId: string) => {
  res.status(404).json(userNotFoundBody(userId))
}
