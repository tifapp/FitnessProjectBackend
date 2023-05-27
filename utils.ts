export type Result<Success, Error> =
  | { status: "success"; value: Success }
  | { status: "error"; value: Error };
