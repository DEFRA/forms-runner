import { MAGIC_LINK_GROUP_ID } from '@defra/forms-engine-plugin'
import { getCacheService } from '@defra/forms-engine-plugin/engine/helpers.js'
import { StatusCodes } from 'http-status-codes'

import { restoreState, showResumeError } from '~/src/server/resume/outcomes.js'

jest.mock('@defra/forms-engine-plugin/engine/helpers.js')

describe('restoreState', () => {
  test('writes the saved state and the magic link group id to the cache, then redirects to the success page', async () => {
    const setState = jest.fn()
    // @ts-expect-error - not all methods mocked
    jest.mocked(getCacheService).mockReturnValueOnce({ setState })

    const request = /** @type {Request} */ ({ server: {} })
    const redirect = jest.fn().mockReturnValue('redirected')
    const h = /** @type {ResponseToolkit} */ (
      /** @type {unknown} */ ({ redirect })
    )

    const outcome = { state: { answer: 'blue' }, magicLinkGroupId: 'group-1' }
    const context = /** @type {ResumeContext} */ ({
      form: { slug: 'my-form' },
      slugAndState: ''
    })

    const result = await restoreState(request, h, outcome, context)

    expect(setState).toHaveBeenCalledWith(request, {
      answer: 'blue',
      [MAGIC_LINK_GROUP_ID]: 'group-1'
    })
    expect(redirect).toHaveBeenCalledWith('/resume-form-success/my-form')
    expect(result).toBe('redirected')
  })

  test('appends the preview slug and state to the redirect', async () => {
    const setState = jest.fn()
    // @ts-expect-error - not all methods mocked
    jest.mocked(getCacheService).mockReturnValueOnce({ setState })

    const request = /** @type {Request} */ ({ server: {} })
    const redirect = jest.fn().mockReturnValue('redirected')
    const h = /** @type {ResponseToolkit} */ (
      /** @type {unknown} */ ({ redirect })
    )

    const outcome = { state: {}, magicLinkGroupId: 'group-1' }
    const context = /** @type {ResumeContext} */ ({
      form: { slug: 'my-form' },
      slugAndState: '/draft'
    })

    await restoreState(request, h, outcome, context)

    expect(redirect).toHaveBeenCalledWith('/resume-form-success/my-form/draft')
  })
})

describe('showResumeError', () => {
  test('redirects to the resume error page for the form with a 303', () => {
    const code = jest.fn().mockReturnValue('final response')
    const redirect = jest.fn().mockReturnValue({ code })
    const h = /** @type {ResponseToolkit} */ (
      /** @type {unknown} */ ({ redirect })
    )
    const context = /** @type {ResumeContext} */ ({ form: { slug: 'my-form' } })

    const result = showResumeError(h, context)

    expect(redirect).toHaveBeenCalledWith('/resume-form-error/my-form')
    expect(code).toHaveBeenCalledWith(StatusCodes.SEE_OTHER)
    expect(result).toBe('final response')
  })
})

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 * @import { ResumeContext } from '~/src/server/resume/types.js'
 */
