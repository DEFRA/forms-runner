import { getErrorMessage } from '@defra/forms-model'
import { Cluster, Redis } from 'ioredis'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * Setup Redis and provide a redis client
 *
 * Local development - 1 Redis instance
 * Out in the wild - Elasticache / Redis Cluster with username and password
 */
export function buildRedisClient() {
  const logger = createLogger()

  const port = 6379
  const db = 0
  const redisConfig = config.get('redis')
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  if (!config.get('isProduction')) {
    logger.info('Connecting to Redis using single instance')

    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix
    })
  } else {
    logger.info('Connecting to Redis using cluster')

    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 2000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          username: redisConfig.username,
          password: redisConfig.password,
          db,
          tls: {}
        }
      }
    )
  }

  redisClient.on('connect', () => {
    logger.info('[redisConnected] Connected to Redis server')
  })

  redisClient.on('close', () => {
    logger.warn(
      '[redisDisconnected] Redis connection closed attempting reconnect with default behavior'
    )
  })

  redisClient.on('error', (error) => {
    const err = getErrorMessage(error)
    logger.error(err, `[redisConnectionError] Redis connection error - ${err}`)
  })

  return redisClient
}
