import {
  clearIdentity,
  getIdentity,
  isLocalPath,
  setIdentity,
  setTransaction,
  takeTransaction
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

  it('has no identity before sign in, or after clearing one', () => {
    const yar = fakeYar()
    expect(getIdentity(yar)).toBeNull()

    setIdentity(yar, identity)
    clearIdentity(yar)

    expect(getIdentity(yar)).toBeNull()
  })

  it('hands out the transaction once, so a replayed callback finds nothing', () => {
    const yar = fakeYar()
    const transaction = {
      state: 'state-1',
      nonce: 'nonce-1',
      codeVerifier: 'verifier-1',
      returnTo: '/homepage/test-form'
    }

    setTransaction(yar, transaction)

    expect(takeTransaction(yar)).toEqual(transaction)
    expect(takeTransaction(yar)).toBeNull()
  })

  it('accepts a local path', () => {
    expect(isLocalPath('/homepage/test-form')).toBe(true)
  })

  it('accepts a local path carrying a query string', () => {
    expect(isLocalPath('/homepage/test-form?a=1&b=2')).toBe(true)
  })

  it('rejects anything that could leave the service', () => {
    expect(isLocalPath('//evil.example')).toBe(false)
    expect(isLocalPath('https://evil.example')).toBe(false)
    expect(isLocalPath('homepage/test-form')).toBe(false)
    expect(isLocalPath('')).toBe(false)
    expect(isLocalPath(undefined)).toBe(false)
    // A URL parser treats a leading backslash as a slash, so this resolves
    // to protocol-relative `//evil.example` even though the raw string
    // starts with a single `/`.
    expect(isLocalPath('/\\evil.example')).toBe(false)
    // A URL parser strips ASCII tab and newline anywhere in the input before
    // resolving, so these also collapse to `//evil.example`.
    expect(isLocalPath('/\t/evil.example')).toBe(false)
    expect(isLocalPath('/\n/evil.example')).toBe(false)
  })
})

/**
 * @import { Yar } from '@hapi/yar'
 */
