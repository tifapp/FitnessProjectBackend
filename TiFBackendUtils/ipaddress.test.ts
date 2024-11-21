import { localPrivateIPV4Address } from "./ipaddress"

describe("IPAddress tests", () => {
  describe("LocalPrivateIPV4Address tests", () => {
<<<<<<< HEAD
    it("should return a private ip address starting", () => {
      const address = localPrivateIPV4Address()
      // NB: This doesn't need to pass on CI machines.
      if (address) {
        expect(address).toMatch(/^(10\.0\.0)|(192\.168)|(172\.)/)
=======
    it("should return a private ip address", () => {
      const address = localPrivateIPV4Address()
      if (address) {
        expect(address).toMatch(/^(10\.)|(192\.168)|(172\.(1[6-9]|2[0-9]|3[0-1]))/)
>>>>>>> 7d9ac09435d7022abbeb6867b7952ddeb964ee86
      }
    })
  })
})
