import { formatCurrency } from '~/src/config/nunjucks/filters/format-currency'

describe('#formatCurrency', () => {
  describe('With defaults', () => {
    test('Currency should be in expected format', () => {
      expect(formatCurrency('20000000')).toEqual('£20,000,000.00')
    })
  })

  describe('With Currency attributes', () => {
    test('Currency should be in provided format', () => {
      expect(formatCurrency('5500000', 'en-US', 'USD')).toEqual('$5,500,000.00')
    })
  })
})
