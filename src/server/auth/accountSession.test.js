import {
  clearSignInTransaction,
  getIdentity,
  getSignInTransaction,
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
      returnUrl: '/homepage/test-form'
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
      returnUrl: '/homepage/test-form'
    }

    setSignInTransaction(yar, transaction)
    clearSignInTransaction(yar)

    expect(getSignInTransaction(yar)).toBeNull()
  })
})

/**
 * @import { Yar } from '@hapi/yar'
 */
