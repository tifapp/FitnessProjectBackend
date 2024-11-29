try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { handler } = require("./app")
  exports.handler = handler
} catch (error) {
  console.error("Module initialization error:", error.stack || error.message)
  throw error
}
