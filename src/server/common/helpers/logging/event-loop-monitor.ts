import { logger } from '~/src/server/common/helpers/logging/logger.js'

const DEFAULT_INTERVAL_MS = 200
const DEFAULT_THRESHOLD_MS = 1000

/**
 * Logs when synchronous work holds the event loop. While the loop is blocked,
 * the service cannot answer requests, including the CDP health check on
 * /health. The log is written once the loop is free, so a block that ends with
 * the container being replaced is not logged.
 * @returns a function that stops the monitor
 */
export function startEventLoopMonitor({
  intervalMs = DEFAULT_INTERVAL_MS,
  thresholdMs = DEFAULT_THRESHOLD_MS
} = {}) {
  let last = performance.now()

  const timer = setInterval(() => {
    const now = performance.now()
    const blockedMs = Math.round(now - last - intervalMs)

    if (blockedMs >= thresholdMs) {
      logger.warn(`[eventLoopBlocked] Event loop blocked for ${blockedMs}ms`)
    }

    last = now
  }, intervalMs)

  timer.unref()

  return () => {
    clearInterval(timer)
  }
}
