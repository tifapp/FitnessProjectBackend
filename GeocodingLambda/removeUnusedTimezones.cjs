/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs")
const path = require("path")

const filesToErase = [
  "./node_modules/geo-tz/data/timezones-1970.geojson.geo.dat",
  "./node_modules/geo-tz/data/timezones.geojson.geo.dat"
]

filesToErase.forEach(file => {
  const filePath = path.join(__dirname, file)
  fs.writeFile(filePath, "", (err) => {
    if (err) {
      console.error(`Failed to delete ${file}: ${err}`)
    } else {
      console.log(`${file} was deleted successfully.`)
    }
  })
})
