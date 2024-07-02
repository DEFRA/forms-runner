import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import config from '~/src/server/config.js'
import { createServer } from '~/src/server/index.js'

const logger = createLogger()

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  throw error
})

/**
 * Main entrypoint to the application.
 */
async function startServer() {
  const server = await createServer()
  await server.start()

  process.send?.('online')

  server.logger.info('Server started successfully')
  server.logger.info(`Access your frontend on http://localhost:${config.port}`)
}

startServer().catch((error: unknown) => {
  logger.info('Server failed to start :(')
  logger.error(error)
})
