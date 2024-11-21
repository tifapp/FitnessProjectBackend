import { execSync } from "child_process"

const commands = [
  "cd TiFBackendUtils && npm test && cd ..",
  "cd APILambda && npm test && cd ..",
  "cd GeocodingLambda && npm test && cd .."
]

commands.forEach(command => {
  console.log(command)
  execSync(command, { stdio: "inherit" })
})
