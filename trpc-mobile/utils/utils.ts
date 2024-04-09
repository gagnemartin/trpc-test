// transform the last active status from a date from active now, active X minutes ago, active today, active more than a day ago
export const getLastActiveAt = (userIds: string[]) => {
  const now = new Date()
  const statuses: Record<string, string> = {}
  userIds.forEach((userId) => {
    const lastActiveAt = new Date()
    lastActiveAt.setHours(now.getHours() - 1)
    statuses[userId] = lastActiveAt.toISOString()
  })
  return statuses
}
