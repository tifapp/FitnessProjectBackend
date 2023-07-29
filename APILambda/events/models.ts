import { z } from "zod";

export const EventColorSchema = z.union([
  z.literal("#EF6351"),
  z.literal("#CB9CF2"),
  z.literal("#88BDEA"),
  z.literal("#72B01D"),
  z.literal("#F7B2BD"),
  z.literal("#F4845F"),
  z.literal("#F6BD60"),
]);

/**
 * All possible colors of an event.
 */
export type EventColor = z.infer<typeof EventColorSchema>
