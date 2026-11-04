import { startEventLoopMonitor } from '~/src/server/common/helpers/logging/event-loop-monitor.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

function blockEventLoop(ms: number) {
  const end = performance.now() + ms

  while (performance.now() < end) {
    // Deliberately hold the thread, as synchronous work does in production
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('startEventLoopMonitor', () => {
  let warn: jest.SpiedFunction<typeof logger.warn>
  let stop: (() => void) | undefined

  beforeEach(() => {
    warn = jest.spyOn(logger, 'warn').mockImplementation()
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    warn.mockRestore()
  })

  it('logs how long the event loop was blocked for', async () => {
    stop = startEventLoopMonitor({ intervalMs: 10, thresholdMs: 100 })
    await wait(30)

    blockEventLoop(300)
    await wait(30)

    expect(warn).toHaveBeenCalledTimes(1)

    const [message] = warn.mock.calls[0] as [string]
    const blockedMs = Number(/blocked for (\d+)ms/.exec(message)?.[1])

    expect(blockedMs).toBeGreaterThanOrEqual(250)
  })

  it('does not log when the event loop stays under the threshold', async () => {
    stop = startEventLoopMonitor({ intervalMs: 10, thresholdMs: 10_000 })

    blockEventLoop(50)
    await wait(30)

    expect(warn).not.toHaveBeenCalled()
  })

  it('stops checking once stopped', async () => {
    stop = startEventLoopMonitor({ intervalMs: 10, thresholdMs: 100 })
    stop()

    blockEventLoop(300)
    await wait(30)

    expect(warn).not.toHaveBeenCalled()
  })
})
