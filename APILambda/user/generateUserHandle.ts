import crypto from "crypto"
import { SQLExecutable } from "../dbconnection"
import { userWithHandleExists } from "./SQL"

const generateNumericHash = (input: string) => {
  const hash = crypto.createHash("sha1").update(input).digest("hex")
  // Convert hex hash to a BigInt and then take modulus to get a fixed size numeric hash
  const numericHash = BigInt(`0x${hash}`) % BigInt(1e5) // using a 5-digit number for simplicity
  return numericHash.toString().padStart(5, "0")
}

export const generateUniqueUsername = async (conn: SQLExecutable, name: string, maxRetries = 3): Promise<string> => {
  const cleanedName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  const baseName = cleanedName.substr(0, 10)

  let retries = 0
  let potentialUsername = `${baseName}${generateNumericHash(`${cleanedName}${Date.now()}`)}`

  while (await userWithHandleExists(conn, potentialUsername)) {
    if (retries >= maxRetries) {
      throw new Error("Max retries reached while generating a unique username.")
    }

    retries++
    potentialUsername = `${baseName}${generateNumericHash(`${cleanedName}${Date.now() + retries}`)}`
  }

  return potentialUsername
}
