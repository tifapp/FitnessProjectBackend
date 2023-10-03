import { UserHandle } from "./UserHandle.js"

describe("UserHandle tests", () => {
  it("should parse a valid user handle from a string", () => {
    const result = UserHandle.schema.safeParse("bitchell_dickle")
    expect(result.success).toEqual(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).data.toString()).toEqual("@bitchell_dickle")
  })

  it("should be undefined for parsing invalid user handle", () => {
    const result = UserHandle.schema.safeParse("&*%&^*")
    expect(result.success).toEqual(false)
  })
})
