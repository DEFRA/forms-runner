import { SNSClient } from '@aws-sdk/client-sns'

import { getSNSClient } from '~/src/server/messaging/sns.js'

jest.mock('@aws-sdk/client-sns')

describe('sns', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSNSClient', () => {
    it('creates SNS client with region and endpoint', () => {
      const client = getSNSClient()

      expect(SNSClient).toHaveBeenCalledWith({
        region: 'eu-west-2',
        endpoint: 'http://localhost:4566'
      })
      expect(client).toBeInstanceOf(SNSClient)
    })

    it('creates SNS client with region only when no endpoint configured', () => {
      const client = getSNSClient()

      expect(SNSClient).toHaveBeenCalledWith({
        region: 'eu-west-2',
        endpoint: 'http://localhost:4566'
      })
      expect(client).toBeInstanceOf(SNSClient)
    })

    it('creates new client instance on each call', () => {
      const client1 = getSNSClient()
      const client2 = getSNSClient()

      expect(SNSClient).toHaveBeenCalledTimes(2)
      expect(client1).toBeInstanceOf(SNSClient)
      expect(client2).toBeInstanceOf(SNSClient)
    })

    it('passes correct configuration to SNS client constructor', () => {
      jest.mocked(SNSClient).mockClear()

      const client = getSNSClient()

      expect(SNSClient).toHaveBeenCalledWith({
        region: 'eu-west-2',
        endpoint: 'http://localhost:4566'
      })
      expect(client).toBeInstanceOf(SNSClient)
    })
  })
})
