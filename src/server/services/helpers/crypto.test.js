import { config } from '~/src/config/index.js'
import { decryptSecret } from '~/src/server/services/helpers/crypto.js'

jest.mock('~/src/config/index.ts', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'privateKeyForSecrets') return 'abcdef'
      return 'mock-value'
    })
  }
}))
jest.mock('node:crypto')

describe('crypto helpers', () => {
  describe('decryptSecret', () => {
    it('should throw is private key is missing', () => {
      jest.mocked(config.get).mockImplementationOnce((key) => {
        if (key === 'privateKeyForSecrets') return undefined
        return 'mock-value'
      })
      expect(() => decryptSecret('some-string')).toThrow(
        'Private key is missing'
      )
    })
  })
})
