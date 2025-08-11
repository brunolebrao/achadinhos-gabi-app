export function calculateNextRun(frequency: string, isRetry = false): Date {
  const now = new Date()
  
  if (isRetry) {
    // Retry after 30 minutes
    return new Date(now.getTime() + 30 * 60 * 1000)
  }

  // If frequency is empty or invalid, default to 1 hour
  if (!frequency || frequency.trim() === '') {
    return new Date(now.getTime() + 60 * 60 * 1000)
  }

  const parts = frequency.split(' ')
  
  if (parts.length !== 5) {
    // Invalid cron format, default to 1 hour
    return new Date(now.getTime() + 60 * 60 * 1000)
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  if (!minute || !hour) {
    // Invalid parts, default to 1 hour
    return new Date(now.getTime() + 60 * 60 * 1000)
  }

  try {
    const nextRun = new Date()

    if (minute === '*' && hour === '*') {
      // Every minute
      nextRun.setMinutes(nextRun.getMinutes() + 1)
    } else if (minute.startsWith('*/')) {
      // Every N minutes
      const interval = parseInt(minute.substring(2))
      if (isNaN(interval)) {
        return new Date(now.getTime() + 60 * 60 * 1000)
      }
      const currentMinute = now.getMinutes()
      const nextMinute = Math.ceil(currentMinute / interval) * interval
      nextRun.setMinutes(nextMinute)
      if (nextRun <= now) {
        nextRun.setMinutes(nextRun.getMinutes() + interval)
      }
    } else if (hour.startsWith('*/')) {
      // Every N hours
      const interval = parseInt(hour.substring(2))
      if (isNaN(interval)) {
        return new Date(now.getTime() + 60 * 60 * 1000)
      }
      const targetMinute = parseInt(minute)
      if (isNaN(targetMinute)) {
        return new Date(now.getTime() + 60 * 60 * 1000)
      }
      nextRun.setMinutes(targetMinute)
      nextRun.setSeconds(0)
      nextRun.setMilliseconds(0)
      
      // Calculate next hour
      const currentHour = now.getHours()
      const nextHour = Math.ceil(currentHour / interval) * interval
      nextRun.setHours(nextHour)
      
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + interval)
      }
    } else if (hour.includes(',')) {
      // Multiple specific hours (e.g., "8,20")
      const hours = hour.split(',').map(h => parseInt(h)).filter(h => !isNaN(h))
      const targetMinute = parseInt(minute)
      if (isNaN(targetMinute) || hours.length === 0) {
        return new Date(now.getTime() + 60 * 60 * 1000)
      }
      
      nextRun.setMinutes(targetMinute)
      nextRun.setSeconds(0)
      nextRun.setMilliseconds(0)
      
      // Find next valid hour
      const currentHour = now.getHours()
      let nextHour = hours.find(h => h > currentHour || (h === currentHour && targetMinute > now.getMinutes()))
      
      if (nextHour === undefined) {
        // No valid hour today, use first hour tomorrow
        nextHour = hours[0]
        nextRun.setDate(nextRun.getDate() + 1)
      }
      
      nextRun.setHours(nextHour || 0)
    } else {
      // Specific hour and minute
      const targetHour = parseInt(hour)
      const targetMinute = parseInt(minute)
      
      if (isNaN(targetHour) || isNaN(targetMinute)) {
        return new Date(now.getTime() + 60 * 60 * 1000)
      }
      
      nextRun.setHours(targetHour)
      nextRun.setMinutes(targetMinute)
      nextRun.setSeconds(0)
      nextRun.setMilliseconds(0)
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
    }

    // Validate the result
    if (isNaN(nextRun.getTime())) {
      return new Date(now.getTime() + 60 * 60 * 1000)
    }

    return nextRun
  } catch (error) {
    // On any error, default to 1 hour
    return new Date(now.getTime() + 60 * 60 * 1000)
  }
}