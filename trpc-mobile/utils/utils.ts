export const getLastActiveAt = (date: Date | null) => {
  if (!date) {
    return null
  }

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(weeks / 4)
  const years = Math.floor(months / 12)

  if (years > 0) {
    return `${years} years ago`
  } else if (months > 0) {
    return `${months} months ago`
  } else if (weeks > 0) {
    return `${weeks} weeks ago`
  } else if (days > 0) {
    return `${days} days ago`
  } else if (hours > 0) {
    return `${hours} hours ago`
  } else if (minutes > 5) {
    return `${minutes} minutes ago`
  } else {
    return 'now'
  }
}
