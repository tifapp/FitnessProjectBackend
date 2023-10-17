/* eslint-disable import/extensions */ // todo: allow ts imports here
import dotenv from "dotenv"

dotenv.config()

export default async (): Promise<void> => {
  console.log(process.memoryUsage())
  if (process.env.TEST_ENV === "staging") {
    // delete cognito users
  }
}
