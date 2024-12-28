try {
  const { handler } = require("./handler")
  exports.handler = async (...rest: unknown[]) => {
    try {
      return (await handler(...rest)).unwrap()
    } catch (error: unknown) {
      console.error("Execution error:", error)
      throw error
    }
  }
} catch (error) {
  console.error("Import error:", error)
  throw error
}
