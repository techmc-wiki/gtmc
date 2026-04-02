/**
 * Formats a date string to absolute time format "YYYY-MM-DD HH:mm"
 */
export function formatAbsoluteTime(
  dateString: string,
  displayTime = true
): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return "Invalid Date"
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")

    if (displayTime) {
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    return `${year}-${month}-${day}`
  } catch {
    return "Invalid Date"
  }
}

/**
 * Formats a date string to relative time within a month, absolute time beyond
 */
export function formatRelativeTime(
  dateString: string,
  displayTime = true
): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return "Invalid Date"
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // Within a month (30 days)
    if (diffDays < 180 && diffDays >= 0) {
      if (diffDays === 0) {
        if (displayTime) {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60))
            return diffMinutes <= 0 ? "Just Now" : `${diffMinutes} Minutes Ago`
          }
          return `${diffHours} Hours Ago`
        }
        return "Today"
      }
      return `${diffDays} Days Ago`
    }

    // Beyond 1/2 year, use absolute format
    return formatAbsoluteTime(dateString, displayTime)
  } catch {
    return "Invalid Date"
  }
}
