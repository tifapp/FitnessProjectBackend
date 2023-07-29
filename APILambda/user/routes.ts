import express, { Response } from "express";
import { z } from "zod";
import { ServerEnvironment } from "../env.js";
import { withValidatedRequest } from "../validation.js";
import {
  overwriteUserSettings,
  registerNewUser,
  sendFriendRequest,
  updateUserProfile,
  userSettingsWithId,
  userWithId,
  userWithIdExists,
} from "./db.js";
import { DEFAULT_USER_SETTINGS, UserSettingsSchema } from "./models.js";

/**
 * Returns an object that indicates that can be used as the response
 * body when a user is not found.
 *
 * @param userId the id of the user who was not found.
 */
export const userNotFoundBody = (userId: string) => ({
  userId,
  error: "user-not-found",
});

/**
 * Sends a user not found response given a response and user id.
 *
 * @param res the response object to use
 * @param userId the id of the user who was not found.
 */
export const userNotFoundResponse = (res: Response, userId: string) => {
  res.status(404).json(userNotFoundBody(userId));
};

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router();
  /**
   * creates a new user
   */
  router.post("/", async (req, res) => {
    await withValidatedRequest(req, res, CreateUserSchema, async (data) => {
      const result = await environment.conn.transaction(async (tx) => {
        const registerReq = Object.assign(data.body, { id: res.locals.selfId });
        return await registerNewUser(tx, registerReq);
      });

      if (result.status === "error") {
        return res.status(400).json({ error: result.value });
      }
      return res.status(201).json(result.value);
    });
  });
  /**
   * sends a friend request to the specified userId
   */
  router.post("/friend/:userId", async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await sendFriendRequest(tx, res.locals.selfId, req.params.userId);
    });
    return res
      .status(result.statusChanged ? 201 : 200)
      .json({ status: result.status });
  });
  /**
   * gets the current user's account info
   */
  router.get("/self", async (_, res) => {
    const user = await userWithId(environment.conn, res.locals.selfId);
    if (!user) {
      return userNotFoundResponse(res, res.locals.selfId);
    }
    return res.status(200).json(user);
  });
  /**
   * deletes the current user's account
   */
  router.delete("/self", async (_, res) => {
    if (await userWithIdExists(environment.conn, res.locals.selfId)) {
      return res.status(204).send();
    }
    return userNotFoundResponse(res, res.locals.selfId);
  })
  /**
   * gets the current user's settings info
   */
  router.get("/self/settings", async (_, res) => {
    const settings = await environment.conn.transaction(async (tx) => {
      return await userSettingsWithId(tx, res.locals.selfId);
    });
    if (settings.status === "error") {
      return userNotFoundResponse(res, res.locals.selfId);
    }
    return res.status(200).json(settings.value ?? DEFAULT_USER_SETTINGS);
  });
  /**
   * gets the user with the specified userId
   */
  router.get("/:userId", async (req, res) => {
    const user = await userWithId(environment.conn, req.params.userId);
    if (!user) {
      return userNotFoundResponse(res, req.params.userId);
    }
    return res.status(200).json({ ...user, relation: "not-friends" });
  });
  /**
   * updates the current user's settings
   */
  router.patch("/self/settings", async (req, res) => {
    await withValidatedRequest(
      req,
      res,
      PatchUserSettingsRequestSchema,
      async (data) => {
        const result = await environment.conn.transaction(async (tx) => {
          return await overwriteUserSettings(tx, res.locals.selfId, data.body);
        });
        if (result.status === "error") {
          return userNotFoundResponse(res, res.locals.selfId);
        }
        return res.status(204).send();
      }
    );
  });
  /**
   * updates the current user's profile
   */
  router.patch("/self", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      const result = await updateUserProfile(tx, {
        selfId: res.locals.selfId,
        ...req.body,
      });
      return res.status(200).json({ result });
    });
  });
  return router;
};

const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().max(50),
    handle: z.string().regex(/^[a-z_0-9]{1,15}$/),
  }),
});

const PatchUserSettingsRequestSchema = z.object({
  body: UserSettingsSchema.partial(),
});
