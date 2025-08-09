#!/usr/bin/env tsx

import { calculateNextRun } from '../apps/scraper/src/utils/cron'

console.log('Testando calculateNextRun:')
console.log('')

const frequencies = [
  '0 */6 * * *',  // Every 6 hours at minute 0
  '0 */2 * * *',  // Every 2 hours at minute 0
  '0 8,20 * * *', // At 8:00 and 20:00
  '*/15 * * * *', // Every 15 minutes
  '',             // Empty string
  'invalid'       // Invalid format
]

for (const freq of frequencies) {
  const next = calculateNextRun(freq)
  const isValid = !isNaN(next.getTime())
  console.log(`Frequency: '${freq}'`)
  console.log(`Next run: ${next}`)
  console.log(`Valid: ${isValid}`)
  console.log('')
}