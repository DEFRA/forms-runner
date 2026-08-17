import {
  clearSignInTransaction,
  getIdentity,
  getSignInTransaction,
  localReturnPath,
  setIdentity,
  setSignInTransaction
} from '~/src/server/auth/accountSession.js'

/** Minimal stand-in for yar — a map with the three methods we use */
function fakeYar() {
  const store = new Map()

  return /** @type {Yar} */ (
    /** @type {unknown} */ ({
      get: (/** @type {string} */ key, /** @type {boolean} */ clear) => {
        const value = store.get(key) ?? null
        if (clear) {
          store.delete(key)
        }
        return value
      },
      set: (/** @type {string} */ key, /** @type {unknown} */ value) =>
        store.set(key, value),
      clear: (/** @type {string} */ key) => store.delete(key)
    })
  )
}

describe('citizen session', () => {
  const identity = {
    iss: 'http://localhost:3011',
    sub: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
    email: 'citizen@example.com',
    idToken: 'header.payload.signature'
  }

  it('round-trips an identity', () => {
    const yar = fakeYar()
    setIdentity(yar, identity)

    expect(getIdentity(yar)).toEqual(identity)
  })

  it('has no identity before sign in', () => {
    expect(getIdentity(fakeYar())).toBeNull()
  })

  it('reads the transaction without consuming it, so a mismatched callback can be checked without destroying it', () => {
    const yar = fakeYar()
    const transaction = {
      state: 'state-1',
      nonce: 'nonce-1',
      codeVerifier: 'verifier-1',
      returnTo: '/homepage/test-form'
    }

    setSignInTransaction(yar, transaction)

    expect(getSignInTransaction(yar)).toEqual(transaction)
    expect(getSignInTransaction(yar)).toEqual(transaction)
  })

  it('consumes the transaction once cleared, so a replayed callback finds nothing', () => {
    const yar = fakeYar()
    const transaction = {
      state: 'state-1',
      nonce: 'nonce-1',
      codeVerifier: 'verifier-1',
      returnTo: '/homepage/test-form'
    }

    setSignInTransaction(yar, transaction)
    clearSignInTransaction(yar)

    expect(getSignInTransaction(yar)).toBeNull()
  })

  it('resolves a local path to itself', () => {
    expect(localReturnPath('/homepage/test-form')).toBe('/homepage/test-form')
    expect(localReturnPath('/homepage/test-form?a=1&b=2')).toBe(
      '/homepage/test-form?a=1&b=2'
    )
  })

  it('resolves a path carrying a control character to the parser’s own normalised form, rather than the raw input', () => {
    // Storing and redirecting to the raw string would carry the newline
    // into an HTTP header and Node would refuse to send it. Resolving to
    // the parser's own output — which already dropped the newline — keeps
    // the destination the parser sees, safely.
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
    'has no resolved path for %s, whose dot segment keeps this origin while resolving to a protocol-relative path',
    (payload) => {
      // A dot segment resolves inside the origin, so the origin never
      // changes and the value carries one leading slash. What makes it
      // off-site is where it lands: `//evil.example`, which a browser reads
      // as a host. Only a check on the resolved path sees it.
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

    // An accepted value has to be a path the browser resolves against the
    // origin it is already on: one leading slash, and no scheme.
    const leaks = payloads
      .map((payload) => [payload, localReturnPath(payload)])
      .filter(
        ([, path]) =>
          path !== null &&
          (path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path))
      )

    expect(leaks).toEqual([])
  })

  it('takes a path, so a fully qualified URL on this service’s own origin is not one', () => {
    // BASE_URL in the test environment. Accepting this would mean the return
    // target could name a host, and the guard would then rest on comparing
    // hosts rather than on the value being a path in the first place.
    expect(
      localReturnPath('http://localhost:3009/homepage/test-form')
    ).toBeNull()
  })
})

/**
 * @import { Yar } from '@hapi/yar'
 */
