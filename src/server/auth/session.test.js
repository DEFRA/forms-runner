import {
  clearTransaction,
  getIdentity,
  getTransaction,
  localReturnPath,
  setIdentity,
  setTransaction
} from '~/src/server/auth/session.js'

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

    setTransaction(yar, transaction)

    expect(getTransaction(yar)).toEqual(transaction)
    expect(getTransaction(yar)).toEqual(transaction)
  })

  it('consumes the transaction once cleared, so a replayed callback finds nothing', () => {
    const yar = fakeYar()
    const transaction = {
      state: 'state-1',
      nonce: 'nonce-1',
      codeVerifier: 'verifier-1',
      returnTo: '/homepage/test-form'
    }

    setTransaction(yar, transaction)
    clearTransaction(yar)

    expect(getTransaction(yar)).toBeNull()
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
})

/**
 * @import { Yar } from '@hapi/yar'
 */
