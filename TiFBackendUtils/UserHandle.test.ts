import { UserHandle } from "./UserHandle"

describe("UserHandle tests", () => {
  it("should parse a valid user handle from a string", () => {
    const result = UserHandle.schema.safeParse("bitchell_dickle")
    expect(result.success).toEqual(true)
    expect((result as any).data.toString()).toEqual("@bitchell_dickle")
  })

  it("should be undefined for parsing invalid user handle", () => {
    const result = UserHandle.schema.safeParse("&*%&^*")
    expect(result.success).toEqual(false)
  })
})
