export type Result<Success, Error> =
  | { status: "success"; data: Success }
  | { status: "error"; data: Error };
