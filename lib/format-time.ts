/**
 * Formats a date string to absolute time format "YYYY-MM-DD HH:mm:ss"
 */
export function formatAbsoluteTime(
  dateString: string,
  displayTime = true
): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return "Invalid Date"
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  if (!displayTime) {
    return `${year}-${month}-${day}`
  }

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Formats a date string to relative time within 180 days, absolute beyond
 */
export function formatRelativeTime(
  dateString: string,
  displayTime = true
): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return "Invalid Date"
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0 || diffDays >= 180) {
    return formatAbsoluteTime(dateString, displayTime)
  }

  if (diffDays > 0) {
    return `${diffDays} Days Ago`
  }

  if (!displayTime) {
    return "Today"
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours > 0) {
    return `${diffHours} Hours Ago`
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  return diffMinutes <= 0 ? "Just Now" : `${diffMinutes} Minutes Ago`
}
