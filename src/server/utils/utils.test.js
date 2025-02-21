import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import { getHeaders } from '~/src/server/utils/utils.js'

jest.mock('@defra/hapi-tracing')

describe('Header helper functions', () => {
  it('should include the trace id in the headers if available', () => {
    jest.mocked(getTraceId).mockReturnValue('my-trace-id')

    const result = getHeaders()
    expect(result).toEqual({
      headers: {
        [config.get('tracing').header]: 'my-trace-id'
      }
    })
  })

  it('should exclude the trace id in the headers if missing', () => {
    jest.mocked(getTraceId).mockReturnValue(null)

    const result = getHeaders()
    expect(result).toEqual({})
  })
})
