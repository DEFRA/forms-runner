import {
  CITIZEN_KEY,
  SIGN_IN_TRANSACTION_KEY,
  clearSignInTransaction,
  getIdentity,
  getSignInTransaction,
  setIdentity,
  setSignInTransaction
} from '~/src/server/auth/accountSession.js'

/** @type {Yar} */
let yar

beforeEach(() => {
  yar = /** @type {Yar} */ (
    /** @type {unknown} */ ({
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    })
  )
})

describe('citizen session', () => {
  const identity = {
    iss: 'http://localhost:3011',
    sub: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',
    email: 'citizen@example.com',
    idToken: 'header.payload.signature'
  }

  it('holds the identity under the citizen key', () => {
    setIdentity(yar, identity)

    expect(yar.set).toHaveBeenCalledWith(CITIZEN_KEY, identity)
  })

  it('reads the identity back from that key', () => {
    jest.mocked(yar.get).mockReturnValue(identity)

    expect(getIdentity(yar)).toEqual(identity)
    expect(yar.get).toHaveBeenCalledWith(CITIZEN_KEY)
  })

  it('has no identity before sign in', () => {
    jest.mocked(yar.get).mockReturnValue(undefined)

    expect(getIdentity(yar)).toBeNull()
  })
})

describe('sign-in transaction', () => {
  const transaction = {
    state: 'state-1',
    nonce: 'nonce-1',
    codeVerifier: 'verifier-1',
    returnUrl: '/homepage/test-form'
  }

  it('holds the transaction under its own key', () => {
    setSignInTransaction(yar, transaction)

    expect(yar.set).toHaveBeenCalledWith(SIGN_IN_TRANSACTION_KEY, transaction)
  })

  it('reads the transaction without consuming it, so a mismatched callback can be checked and the genuine one still completes', () => {
    jest.mocked(yar.get).mockReturnValue(transaction)

    expect(getSignInTransaction(yar)).toEqual(transaction)
    // yar clears on read when the second argument says so. Passing the key
    // alone leaves the transaction in the session.
    expect(yar.get).toHaveBeenCalledWith(SIGN_IN_TRANSACTION_KEY)
  })

  it('has no transaction before a sign in starts', () => {
    jest.mocked(yar.get).mockReturnValue(undefined)

    expect(getSignInTransaction(yar)).toBeNull()
  })

  it('clears the transaction on its own key, so a replayed callback finds nothing', () => {
    clearSignInTransaction(yar)

    expect(yar.clear).toHaveBeenCalledWith(SIGN_IN_TRANSACTION_KEY)
  })
})

/**
 * @import { Yar } from '@hapi/yar'
 */
