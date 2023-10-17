/* eslint-disable import/extensions */ // todo: allow ts imports here

export default async (): Promise<void> => {
  console.log(process.memoryUsage())
  if (process.env.NODE_ENV === "staging") {
    // delete cognito users
  }
}
