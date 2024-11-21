import { EventEditLocation } from "TiFShared/domain-models/Event"
import { dayjs } from "TiFShared/lib/Dayjs"
import { testAPI } from "../test/testApp"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("Edit event tests", () => {
  const eventLocation : EventEditLocation = { type: "coordinate", value: { latitude: 50, longitude: 50 }}

  // Event doesn't exist
  it("should return 404 if the event doesn't exist", async () => {
    
    const newUser = await createUserFlow()

    const resp = await testAPI.editEvent({auth: newUser.auth, body: 
    {
      title: "Test",
      description: "idk",
      startDateTime: dayjs().subtract(24, "hour").toDate(),
      duration: 10,
      shouldHideAfterStartDate: true,
      location: eventLocation
    }, params: {eventId: 0}})

    console.log(resp.data)

    expect(resp).toMatchObject({
      status: 404
    })

  })

  // Ensure only the host can only edit the event
  it("should return 403 if a user besides the host tries to edit an event", async () => {
    
    const newUser = await createUserFlow()
    const {
      eventIds
    } = await createEventFlow([
      {
        title: "test event",
        coordinates: {
          latitude: 25,
          longitude: 25
        }
      }
    ])

    const resp = await testAPI.editEvent({auth: newUser.auth, body: 
    {
      title: "Test",
      description: "idk",
      startDateTime: dayjs().subtract(24, "hour").toDate(),
      duration: 10,
      shouldHideAfterStartDate: true,
      location: eventLocation
    }, params: {eventId: eventIds[0]}})

    expect(resp).toMatchObject({
      status: 403
    })

  })

  // Happy Path
  it("should return 403 if a user besides the host tries to edit an event", async () => {
    const {
      eventIds,
      host
    } = await createEventFlow([
      {
        title: "test event",
        coordinates: {
          latitude: 25,
          longitude: 25
        }
      }
    ])

    const resp = await testAPI.editEvent({auth: host.auth, body: 
    {
      title: "Test",
      description: "idk",
      startDateTime: dayjs().subtract(24, "hour").toDate(),
      duration: 10,
      shouldHideAfterStartDate: true,
      location: eventLocation
    }, params: {eventId: eventIds[0]}})

    console.log("Resp data ", resp.data)

    expect(resp).toMatchObject({
      status: 200
    })

  })

})
