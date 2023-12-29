import { determineChatPermissions } from "./getChatToken.js"

describe("determineChatPermissions", () => {
  it("should return admin permissions for a host user", () => {
    const hostId = "1234"
    const userId = "1234"
    const endTimestamp = new Date() // Current Date
    endTimestamp.setFullYear(endTimestamp.getFullYear() + 1)
    const eventId = 1

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      1: ["history", "subscribe", "publish"],
      "1-pinned": ["history", "subscribe", "publish"]
    })
  })

  it("should return attendee permissions for a non-host user before the event end date", () => {
    const hostId = "1234"
    const userId = "5678"
    const endTimestamp = new Date() // Current Date
    endTimestamp.setFullYear(endTimestamp.getFullYear() + 1)
    const eventId = 2

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      2: ["history", "subscribe", "publish"],
      "2-pinned": ["history", "subscribe"]
    })
  })

  it("should return viewer permissions for a non-host user after the event end date", () => {
    const hostId = "1234"
    const userId = "5678"
    const endTimestamp = new Date("2022-09-15T12:00:00Z") // Past date
    const eventId = 3

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      3: ["history", "subscribe"],
      "3-pinned": ["history", "subscribe"]
    })
  })
})
