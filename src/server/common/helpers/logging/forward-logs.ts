import { getErrorMessage } from '@defra/forms-model'
import {
  type LogEvent,
  type RequestEvent,
  type ServerRegisterPluginObject
} from '@hapi/hapi'
import type pino from 'pino'

export const forwardLogs = (
  logger: pino.Logger,
  event: LogEvent | RequestEvent,
  tags: Record<string, true>
) => {
  const tagstr = event.tags.join(',')
  const message = `Channel: ${event.channel}, Tags: [${tagstr}]`

  if ('error' in tags && event.channel !== 'internal') {
    logger.error(
      event.error,
      `${message}, Error: ${getErrorMessage(event.error)}`
    )
  } else {
    const data =
      typeof event.data === 'string'
        ? event.data
        : `type - ${typeof event.data}`

    logger.info(`${message}, Data: ${data}`)
  }
}

export default {
  plugin: {
    name: 'forward-logs',
    register: (server) => {
      server.events.on('log', (event, tags) =>
        forwardLogs(server.logger, event, tags)
      )

      server.events.on('request', (request, event, tags) =>
        forwardLogs(request.logger, event, tags)
      )
    }
  }
} satisfies ServerRegisterPluginObject<void>
