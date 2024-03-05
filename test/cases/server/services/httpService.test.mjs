import { expect } from '@hapi/code'
import * as Lab from '@hapi/lab'
import sinon from 'sinon'
import wreck from '@hapi/wreck'

import { post } from '../../../../src/server/services/httpService.js'

export const lab = Lab.script()
const { suite, test, afterEach } = lab

suite('Http Service', () => {
  afterEach(() => {
    sinon.restore()
  })

  test('post request payload format is correct', async () => {
    sinon.stub(wreck, 'post').returns(
      Promise.resolve({
        res: {},
        payload: { reference: '1234' }
      })
    )
    const result = await post('/test', {})
    expect(result).to.equal({ res: {}, payload: { reference: '1234' } })
  })
})
