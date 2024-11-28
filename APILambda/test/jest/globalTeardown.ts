import { envVars } from "TiFBackendUtils/env"

export default async (): Promise<void> => {
  console.log(process.memoryUsage())
  if (envVars.ENVIRONMENT === "stagingTest") {
    // delete cognito users
  }
}
