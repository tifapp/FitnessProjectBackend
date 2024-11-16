import os from "os"
import "TiFShared/lib/Array"

/**
 * Returns a local private IPV4 Address string from the currently connected local network.
 */
export const localPrivateIPV4Address = () => {
  const networkInterfaces = os.networkInterfaces()
  return Object.keys(networkInterfaces)
    .ext.compactMap((key) => networkInterfaces[key])
    .flat()
    .find((iface) => {
      return (
        iface.family === "IPv4" && !iface.internal && isPrivate(iface.address)
      )
    })?.address
}

const isPrivate = (address: string) => {
  const parts = address.split(".").map(Number)
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}