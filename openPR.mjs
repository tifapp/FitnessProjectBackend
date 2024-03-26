import { execSync } from "child_process"
import open from "open"

const title = encodeURIComponent("Your PR Title")
const body = encodeURIComponent("Your PR Body with details.\n\nAnother line of details.")

const repoOwner = "tifapp"
const repoName = "FitnessProjectBackend"
const branchName = "development"

const headers = {
  Authorization: `token ${process.env.GITHUB_READ_TOKEN}`
}

const getCurrentBranchName = () => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
  } catch (error) {
    console.error("Error getting current branch name:", error)
    process.exit(1)
  }
}

const openPRIfNoneExist = async () => {
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?head=${repoOwner}:${getCurrentBranchName()}&state=open`

  try {
    const response = await fetch(apiUrl, { headers })
    const prs = await response.json()

    if (prs.length === 0) {
      const prUrl = `https://github.com/${repoOwner}/${repoName}/compare/${branchName}?expand=1&title=${title}&body=${body}`
      console.log(`No open PRs found for ${branchName}, opening PR form.`)
      open(prUrl)
    }
  } catch (error) {
    console.error("Failed to check for open PRs:", error)
  }
}

openPRIfNoneExist()
