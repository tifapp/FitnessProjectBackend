import type { EventEditLocation } from "TiFShared/domain-models/Event"

try {
  const { handler } = require("./handler")
  exports.handler = async (params: EventEditLocation) => {
    try {
      return (await handler(params)).unwrap()
    } catch (error: unknown) {
      console.error("Execution error:", error)
      throw error
    }
  }
} catch (error) {
  console.error("Import error:", error)
  throw error
}
