import { envVars } from "./env";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockInDevTest = (fn: (..._: any) => any) => envVars.ENVIRONMENT === "devTest" ? async () => {} : fn