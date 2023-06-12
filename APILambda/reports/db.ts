import { z } from "zod";
import { SQLExecutable } from "../dbconnection";

export type EventReportRequest = {
  userReporting: string;
  eventReported: string;
  reportingReason: number;
  reportDate: Date;
  eventOwnerId: string;
}

/**
 * Creates an event report in the database.
 *
 * @param request see {@link EventReportRequest}
 */
export const createEventReport = async (
  conn: SQLExecutable,
  request: EventReportRequest
) => {
  await conn.execute(
    `
    INSERT INTO eventReports (
      userReporting,
      eventReported, 
      reportingReason, 
      reportDate, 
      eventOwnerId, 
    ) VALUES (
      :selfId,
      :eventReported, 
      :reportingReason, 
      :reportDate, 
      :eventOwnerId, 
    )
    `,
    request
  );
};
