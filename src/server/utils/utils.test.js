import { getTraceId } from '@defra/hapi-tracing'

import { config } from '~/src/config/index.js'
import {
  applyTraceHeaders,
  getFeedbackFormLink,
  localReturnPath,
  resolveLanguage,
  signInUrl
} from '~/src/server/utils/utils.js'

jest.mock('@defra/hapi-tracing')

describe('utils', () => {
  describe('Header helper functions', () => {
    it('should include the trace id in the headers if available', () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')

      const result = applyTraceHeaders() // Updated to applyTraceHeaders
      expect(result).toEqual({
        [config.get('tracing').header]: 'my-trace-id'
      })
    })

    it('should exclude the trace id in the headers if missing', () => {
      jest.mocked(getTraceId).mockReturnValue(null)

      const result = applyTraceHeaders() // Updated to applyTraceHeaders
      expect(result).toBeUndefined()
    })

    it('should merge existing headers with the trace id if available', () => {
      jest.mocked(getTraceId).mockReturnValue('my-trace-id')

      const existingHeaders = { Authorization: 'Bearer token' }
      const result = applyTraceHeaders(existingHeaders) // Updated to applyTraceHeaders

      expect(result).toEqual({
        Authorization: 'Bearer token',
        [config.get('tracing').header]: 'my-trace-id'
      })
    })

    it('should return existing headers without modification if trace id is missing', () => {
      jest.mocked(getTraceId).mockReturnValue(null)

      const existingHeaders = { Authorization: 'Bearer token' }
      const result = applyTraceHeaders(existingHeaders) // Updated to applyTraceHeaders

      expect(result).toEqual({
        Authorization: 'Bearer token'
      })
    })

    it('should return existing headers if tracing header configuration is missing', () => {
      const existingHeaders = { Authorization: 'Bearer token' }
      const result = applyTraceHeaders(existingHeaders, '')

      expect(result).toBe(existingHeaders)
    })
  })

  describe('feedbackLink', () => {
    it('should return feedback link', () => {
      expect(getFeedbackFormLink('source-form-id')).toEqual({
        feedbackLink: '/form/feedback?formId=source-form-id'
      })
    })
  })

  describe('resolveLanguage', () => {
    const mockYarStore = /** @type {Record<string,string>} */ ({})
    /**
     * @param {string} name
     * @param {string} value
     */
    function yarSet(name, value) {
      mockYarStore[name] = value
    }
    /**
     * @param {string} name
     */
    function yarGet(name) {
      return mockYarStore[name]
    }

    it('should return default language if yar session not properly constructed yet', () => {
      expect(resolveLanguage({}, undefined)).toBe('en-GB')
    })

    it('should return specified language if yar session up and language passed as query param', () => {
      expect(
        resolveLanguage(
          { language: 'cy' },
          // @ts-expect-error - partial mock of methods
          { id: 'session-id', set: yarSet, get: yarGet }
        )
      ).toBe('cy')

      // Should retrieve session value when language not passed
      expect(
        // @ts-expect-error - partial mock of methods
        resolveLanguage({}, { id: 'session-id', set: yarSet, get: yarGet })
      ).toBe('cy')
    })
  })
})

describe('localReturnPath', () => {
  it('resolves a local path to itself', () => {
    expect(localReturnPath('/homepage/test-form')).toBe('/homepage/test-form')
    expect(localReturnPath('/form/test-form/page-one?lang=cy')).toBe(
      '/form/test-form/page-one?lang=cy'
    )
  })

  it('returns the parser’s normalised form of a path carrying a control character, not the raw input', () => {
    // Node rejects a Location header containing a newline. The parser drops
    // it, so the resolved path is safe to send.
    expect(localReturnPath('/foo\nSet-Cookie: a=b')).toBe(
      '/fooSet-Cookie:%20a=b'
    )
  })

  it('has no resolved path for anything that could leave the service', () => {
    expect(localReturnPath('//evil.example')).toBeNull()
    expect(localReturnPath('https://evil.example')).toBeNull()
    expect(localReturnPath('homepage/test-form')).toBeNull()
    expect(localReturnPath('')).toBeNull()
    expect(localReturnPath(undefined)).toBeNull()
    // A URL parser treats a leading backslash as a slash, so this resolves
    // to protocol-relative `//evil.example` even though the raw string
    // starts with a single `/`.
    expect(localReturnPath('/\\evil.example')).toBeNull()
    // A URL parser strips ASCII tab and newline anywhere in the input before
    // resolving, so these also collapse to `//evil.example`.
    expect(localReturnPath('/\t/evil.example')).toBeNull()
    expect(localReturnPath('/\n/evil.example')).toBeNull()
  })

  it.each([
    '/.//evil.example',
    '/..//evil.example',
    '/./\\evil.example',
    '/../\\evil.example',
    '/.///evil.example',
    '/x/..//evil.example'
  ])(
    'has no resolved path for %s, whose dot segment keeps the local origin while resolving to a protocol-relative path',
    (payload) => {
      // The dot segment resolves inside the origin, so the origin does not
      // change and the input has one leading slash. It resolves to the path
      // `//evil.example`, which a browser reads as a host.
      expect(localReturnPath(payload)).toBeNull()
    }
  )

  it('lets no separator and prefix combination resolve to an off-site path', () => {
    const payloads = []
    const seps = ['/', '\\', '\t', '\n', '\r', '%2F', '%5C', ' ']
    const prefixes = ['', '/', '//', '///', '/.', '/..', '/./', '/../', '/x/..']

    for (const prefix of prefixes) {
      for (const sep of seps) {
        for (const host of ['attacker.example', 'evil.example']) {
          payloads.push(
            `${prefix}${sep}${host}`,
            `${prefix}${sep}${sep}${host}`,
            `${prefix}${sep}${sep}${sep}${host}`
          )
        }
      }
    }

    // An accepted value must be a path: one leading slash and no scheme.
    const leaks = payloads
      .map((payload) => [payload, localReturnPath(payload)])
      .filter(
        ([, path]) =>
          path !== null &&
          (path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path))
      )

    expect(leaks).toEqual([])
  })

  it('takes a path, so a fully qualified URL is not one', () => {
    expect(
      localReturnPath('http://localhost:3009/homepage/test-form')
    ).toBeNull()
  })
})

describe('signInUrl', () => {
  it('carries the return path as an escaped query parameter, so its own slashes and query stay in it', () => {
    expect(signInUrl('/homepage/test-form')).toBe(
      '/auth/sign-in?returnUrl=%2Fhomepage%2Ftest-form'
    )
    expect(signInUrl('/form/test-form/page-one?lang=cy')).toBe(
      '/auth/sign-in?returnUrl=%2Fform%2Ftest-form%2Fpage-one%3Flang%3Dcy'
    )
  })
})
