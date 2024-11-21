import { execSync } from "child_process"
import { readFileSync } from "fs"
import path from "path"

const getCurrentCommitHash = (repoPath) => {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoPath }).toString().trim()
  } catch (error) {
    console.error(`Failed to get commit hash for ${repoPath}:`, error)
    return null
  }
}

const packageJson = JSON.parse(readFileSync(path.resolve("TiFBackendUtils/package.json"), "utf8"))
const expectedCommitHash = packageJson.peerDependencies.TiFShared.split("#")[1]

const currentCommitHash = getCurrentCommitHash(path.resolve("TiFBackendUtils/node_modules/TiFShared"))

if (currentCommitHash !== expectedCommitHash) {
  console.error(
    `Linked TiFShared package does not match the expected version; may not work as expected:\nExpected: ${expectedCommitHash}\nFound: ${currentCommitHash}`
  )
} else {
  console.log(`Linked TiFShared package matches the expected version: ${currentCommitHash}`)
}
