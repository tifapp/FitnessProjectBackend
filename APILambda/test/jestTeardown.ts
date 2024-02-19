/* eslint-disable import/extensions */ // todo: allow ts imports here
import { testEnvVars } from "./testEnv"

export default async (): Promise<void> => {
  console.log(process.memoryUsage())
  if (testEnvVars.TEST_ENV === "staging_tests") {
    // delete cognito users
  }
}
