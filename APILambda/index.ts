try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { handler } = require("./app")
  exports.handler = handler
} catch (error) {
  console.error("Lambda error:", error.stack || error.message)
  throw error
}
