import { Request, Response, RequestHandler } from "express";
import { AnyZodObject, z } from "zod";

/**
 * Validates a request with the given zod schema and returns a 400 error status code
 * if the request doesn't match the zod schema.
 *
 * @example
 * ```ts
 * const CreateUserSchema = z.object({
 *   body: z.object({
 *     name: z.string().max(50),
 *     handle: z.string().regex(/^[a-z_0-9]{1,15}$/),
 *   }),
 * });
 *
 * // In some router
 *
 * async (req, res) => {
 *   await withValidatedRequest(req, res, CreateUserSchema, async (data) => {
 *     // ... Do stuff with the data that is now typesafe.
 *   });
 * }
 * ```
 */
export const withValidatedRequest = async <Schema extends AnyZodObject>(
  req: Request,
  res: Response,
  schema: Schema,
  fn: (data: z.infer<Schema>) => Promise<any>
) => {
  try {
    const data = await schema.passthrough().parseAsync(req);
    return await fn(data);
  } catch (err) {
    return res.status(400).json(err);
  }
};
