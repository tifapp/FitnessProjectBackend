import { SQLExecutable } from "./dbconnection";
import { LocationCoordinate2D } from "./location";

export type EventColor =
  | "#EF6351"
  | "#CB9CF2"
  | "#88BDEA"
  | "#72B01D"
  | "#F7B2BD"
  | "#F4845F"
  | "#F6BD60";

export type CreateEventRequest = {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  color: EventColor;
  shouldHideAfterStartDate: boolean;
  isChatEnabled: boolean;
} & LocationCoordinate2D;

/**
 * Creates an event in the database.
 *
 * @param request see {@link CreateEventRequest}
 */
export const createEvent = async (
  conn: SQLExecutable,
  request: CreateEventRequest
) => {
  await conn.execute(
    `
    INSERT INTO event (
        title, 
        description, 
        startDate, 
        endDate, 
        color, 
        shouldHideAfterStartDate, 
        isChatEnabled, 
        latitude, 
        longitude
    ) VALUES (
      :title, 
      :description, 
      :startDate, 
      :endDate, 
      :color, 
      :shouldHideAfterStartDate, 
      :isChatEnabled, 
      :latitude, 
      :longitude
    )
    `,
    request
  );
};
