import { mapNestedFields } from "./mapNestedFields.js"

describe("mapNestedFields", () => {
  it("should return the same object if mappings are not provided", () => {
    const obj = { field1: "value1", field2: { subfield1: "value2", subfield2: "value3" } }
    const result = mapNestedFields(obj)
    expect(result).toEqual(obj)
  })

  it("should correctly group fields together", () => {
    const obj = { field1: "value1", field2: { subfield1: "value2", subfield2: "value3" } }
    const result = mapNestedFields(obj, { nested: ["field1", "field2"] })
    expect(result).toEqual({ nested: { field1: "value1", field2: { subfield1: "value2", subfield2: "value3" } } })
  })
})
