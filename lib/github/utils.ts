export function parseIssueNumber(id: string): number {
  const num = parseInt(id, 10)
  if (isNaN(num)) throw new Error("Invalid issue number")
  return num
}
