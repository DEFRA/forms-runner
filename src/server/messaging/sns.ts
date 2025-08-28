import { SNSClient } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'

const awsRegion = config.get('awsRegion')
const snsEndpoint = config.get('snsEndpoint')

/**
 * Get SNS client instance
 * @returns {SNSClient} SNS client
 */
export function getSNSClient(): SNSClient {
  const clientConfig: { region: string; endpoint?: string } = {
    region: awsRegion
  }

  if (snsEndpoint) {
    clientConfig.endpoint = snsEndpoint
  }

  return new SNSClient(clientConfig)
}
