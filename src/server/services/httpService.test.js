import wreck from '@hapi/wreck'

import { post } from '~/src/server/services/httpService.js'

describe('Http Service', () => {
  test('post request payload format is correct', async () => {
    jest.spyOn(wreck, 'post').mockResolvedValue({
      res: /** @type {IncomingMessage} */ ({ statusCode: 200 }),
      payload: { reference: '1234' }
    })

    const result = await post('/test', {})
    expect(result).toEqual({
      res: { statusCode: 200 },
      payload: { reference: '1234' }
    })
  })
})

/**
 * @import { IncomingMessage } from 'node:http'
 */
