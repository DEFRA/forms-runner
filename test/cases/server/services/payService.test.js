import { nanoid } from 'nanoid'
import { PayService } from '../../../../src/server/services/payService.js'
import { format } from 'date-fns'

jest.mock('nanoid')

describe('Server PayService Service', () => {
  /** @type {import('@hapi/hapi').Server} */
  const server = {
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  }

  test('Currency formatted correctly in description', async () => {
    const service = new PayService(server)
    const result = service.descriptionFromFees({
      total: 3.5,
      details: [
        {
          description: 'A',
          amount: 350
        }
      ]
    })
    expect(result).toBe('A: £3.50')
  })

  test('Currency formatted correctly in description with multipliers', async () => {
    const service = new PayService(server)
    const result = service.descriptionFromFees({
      paymentReference: '',
      total: 3.5,
      details: [
        {
          description: 'A',
          amount: 350,
          multiplier: 'numberOf',
          multiplyBy: 3
        }
      ]
    })
    expect(result).toBe('3 x A: £10.50')
  })

  test('Currency formatted correctly in description with multiple fees', async () => {
    const service = new PayService(server)

    const result = service.descriptionFromFees({
      total: 3.5,
      details: [
        {
          description: 'A',
          amount: 350,
          multiplier: 'numberOf',
          multiplyBy: 3
        },
        {
          description: 'B',
          amount: 15000
        }
      ]
    })
    expect(result).toBe('3 x A: £10.50, B: £150.00')
  })

  describe('reference is generated correctly', () => {
    jest.mocked(nanoid).mockReturnValue('b33pb00p')

    const today = format(new Date(), 'ddMMyyyy')
    const service = new PayService(server)

    test('{{PREFIX}} replacement is correct', () => {
      expect(
        service.referenceFromFees(['fee', 'fii', 'fo'], '{{PREFIX}}')
      ).toBe('fee-fii-fo-b33pb00p')
      expect(service.referenceFromFees(['fee'], 'FCDO-{{PREFIX}}')).toBe(
        'FCDO-fee-b33pb00p'
      )
      expect(service.referenceFromFees([], 'FCDO-{{PREFIX}}')).toBe(
        'FCDO--b33pb00p'
      )
    })

    test('{{DATE*}} replacement is correct', () => {
      expect(service.referenceFromFees([], 'FRIED-{{DATE}}')).toBe(
        `FRIED-${today}-b33pb00p`
      )
      expect(service.referenceFromFees([], '{{DATE}}')).toBe(
        `${today}-b33pb00p`
      )
      expect(service.referenceFromFees([], '{{DATE:}}')).toBe(
        `${today}-b33pb00p`
      )

      expect(service.referenceFromFees(['fee', 'fii', 'fo'], '{{DATE}}')).toBe(
        `${today}-b33pb00p`
      )

      const yyyymmdd = format(new Date(), 'yyyymmdd')
      expect(service.referenceFromFees([], '{{DATE:yyyymmdd}}')).toBe(
        `${yyyymmdd}-b33pb00p`
      )

      const split = format(new Date(), 'dd-mm-yyyy')
      expect(service.referenceFromFees([], '{{DATE:dd-mm-yyyy}}')).toBe(
        `${split}-b33pb00p`
      )
    })

    test('combination replacement is correct', () => {
      expect(service.referenceFromFees([], '{{DATE}}-{{PREFIX}}')).toBe(
        `${today}--b33pb00p`
      )
      expect(
        service.referenceFromFees(['scrambled'], '{{PREFIX}}-{{DATE}}')
      ).toBe(`scrambled-${today}-b33pb00p`)

      expect(
        service.referenceFromFees(
          ['scrambled', 'fried'],
          'EGGS:{{PREFIX}}-{{DATE}}'
        )
      ).toBe(`EGGS:scrambled-fried-${today}-b33pb00p`)
    })

    test('no tags format is correct', () => {
      expect(service.referenceFromFees([], 'FCDO')).toBe('FCDO-b33pb00p')
    })
  })
})
