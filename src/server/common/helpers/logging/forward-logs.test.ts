import { type RequestEvent } from '@hapi/hapi'
import type pino from 'pino'

import { forwardLogs } from '~/src/server/common/helpers/logging/forward-logs.js'

describe('forwardLogs', () => {
  let logger: pino.Logger

  beforeEach(() => {
    const info = jest.fn()
    const error = jest.fn()

    logger = { error, info } as unknown as pino.Logger
  })

  it('logs info with string data', () => {
    forwardLogs(
      logger,
      {
        channel: 'app',
        timestamp: Date.now().toString(),
        tags: ['a', 'b', 'c'],
        data: 'My log msg'
      } as RequestEvent,
      { a: true, b: true, c: true }
    )

    expect(logger.info).toHaveBeenCalledExactlyOnceWith(
      'Channel: app, Tags: [a,b,c], Data: My log msg'
    )
  })

  it('logs info with undefined data', () => {
    forwardLogs(
      logger,
      {
        channel: 'app',
        timestamp: Date.now().toString(),
        tags: ['a', 'b', 'c']
      } as RequestEvent,
      { a: true, b: true, c: true }
    )

    expect(logger.info).toHaveBeenCalledExactlyOnceWith(
      'Channel: app, Tags: [a,b,c], Data: type - undefined'
    )
  })

  it('logs info with object data', () => {
    forwardLogs(
      logger,
      {
        channel: 'app',
        timestamp: Date.now().toString(),
        tags: ['a', 'b', 'c'],
        data: { some: 'data' }
      } as RequestEvent,
      { a: true, b: true, c: true }
    )

    expect(logger.info).toHaveBeenCalledExactlyOnceWith(
      'Channel: app, Tags: [a,b,c], Data: type - object'
    )
  })

  it('logs info with function data', () => {
    forwardLogs(
      logger,
      {
        channel: 'app',
        timestamp: Date.now().toString(),
        tags: ['a', 'b', 'c'],
        data: () => {
          ''
        }
      } as RequestEvent,
      { a: true, b: true, c: true }
    )

    expect(logger.info).toHaveBeenCalledExactlyOnceWith(
      'Channel: app, Tags: [a,b,c], Data: type - function'
    )
  })

  it('logs error with string data', () => {
    const error = new Error('Some error')

    forwardLogs(
      logger,
      {
        channel: 'internal',
        timestamp: Date.now().toString(),
        tags: ['a', 'b', 'c', 'error'],
        error
      } as RequestEvent,
      { a: true, b: true, c: true, error: true }
    )

    expect(logger.error).toHaveBeenCalledWith(
      error,
      'Channel: internal, Tags: [a,b,c,error], Error: Some error'
    )
  })
})
