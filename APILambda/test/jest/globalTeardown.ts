/* eslint-disable import/extensions */ // todo: allow ts imports here
import { testEnvVars } from "../testEnv"

export default async (): Promise<void> => {
  console.log(process.memoryUsage())
  if (testEnvVars.API_ENDPOINT) {
    // delete cognito users
  }
}
