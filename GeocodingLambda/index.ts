try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { handler } = require("./handler")
  exports.handler = handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (error: any) {
  console.error("Lambda error:", error.stack || error.message)
  throw error
}
