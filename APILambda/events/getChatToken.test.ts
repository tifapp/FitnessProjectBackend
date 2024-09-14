// import { randomInt } from "crypto"
// import { callCreateEvent, callGetEventChatToken } from "../test/apiCallers/eventEndpoints"
// import { testEventInput } from "../test/testEvents"
// import { createUserFlow } from "../test/userFlows/createUserFlow"

// describe("GetTokenRequest tests", () => {
//   // TODO: Make shared util for this
//   // it("should return 401 if user does not exist", async () => {
//   //   const resp = await callGetEventChatToken(global.defaultUser.auth, randomInt(1000))

//   //   expect(resp.status).toEqual(401)
//   //   expect(resp.body).toMatchObject({ body: "user does not exist" })
//   // })

//   it("should return 404 if the event doesnt exist", async () => {
//     const { token: userToken } = await createUserFlow()
//     const resp = await callGetEventChatToken(
//       userToken,
//       randomInt(1000)
//     )

//     expect(resp).toMatchObject({
//       status: 404,
//       body: { error: "event-not-found" }
//     })
//   })

//   it("should return 404 if the user is not part of the event", async () => {
//     const { token: userToken } = await createUserFlow()
//     const event = await callCreateEvent(userToken, testEventInput)

//     const { token: user2Token } = await createUserFlow()
//     const resp = await callGetEventChatToken(user2Token, event.body.id)

//     expect(resp).toMatchObject({
//       status: 403,
//       body: { error: "user-not-attendee" }
//     })
//   })

//   // test all error cases
//   // test success case
//   // unit test getRole() function
// })
