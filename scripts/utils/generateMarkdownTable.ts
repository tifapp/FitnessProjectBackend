/**
 * @param rows An array of objects of the same shape
 * @returns A markdown table as a string
 * @throws {Error} If no data is provided.
 */
export const generateMarkdownTable = (rows: unknown[]): string => {
  if (rows.length === 0) {
    throw new Error("No data given to create a markdown table.")
  }

  const headers = Object.keys(rows[0])

  let markdownContent = "| " + headers.join(" | ") + " |\n"
  markdownContent += "| " + headers.map(() => "----------").join(" | ") + " |\n"

  rows.forEach((row) => {
    const rowValues = headers.map((header) => {
      const value = row[header]
      return value !== undefined && value !== null ? value.toString() : "None"
    })
    markdownContent += "| " + rowValues.join(" | ") + " |\n"
  })

  return markdownContent
}
