import { localPrivateIPV4Address } from "./ipaddress"

describe("IPAddress tests", () => {
  describe("LocalPrivateIPV4Address tests", () => {
    it("should return a private ip address", () => {
      const address = localPrivateIPV4Address()
      if (address) {
        expect(address).toMatch(
          /^(10\.)|(192\.168)|(172\.(1[6-9]|2[0-9]|3[0-1]))/
        )
      }
    })
  })
})
