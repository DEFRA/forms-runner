import { SNSClient } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'

const awsRegion = config.get('awsRegion')
const snsEndpoint = config.get('snsEndpoint')

/**
 * Retrieves an SNS client
 * @returns {SNSClient}
 */
export function getSNSClient() {
  return new SNSClient({
    region: awsRegion,
    endpoint: snsEndpoint
  })
}
