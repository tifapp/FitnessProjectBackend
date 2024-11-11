import { localPrivateIPV4Address } from "./ipaddress"

describe("IPAddress tests", () => {
  describe("LocalPrivateIPV4Address tests", () => {
    it("should return a private ip address starting", () => {
      const address = localPrivateIPV4Address()
      // NB: This doesn't need to pass on CI machines.
      if (address) {
        expect(address).toMatch(/^(10\.0\.0)|(192\.168)|(172\.)/)
      }
    })
  })
})
