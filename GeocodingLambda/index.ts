exports.handler = async (event: any, context: any) => {
  console.log("Log Stream Name:", context.logStreamName)
  console.log("Event:", JSON.stringify(event))
  try {
    const { handler } = require("./handler")
    return (await handler(event, context)).unwrap()
  } catch (error) {
    console.error("Execution error:", error)
    throw error
  }
}
