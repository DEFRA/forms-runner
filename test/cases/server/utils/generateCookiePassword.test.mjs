import generateCookiePassword from '../../../../src/server/utils/generateCookiePassword.js'

describe('Cookie password generator', () => {
  test('Generates a random password 32 characters long', () => {
    const password1 = generateCookiePassword()
    const password2 = generateCookiePassword()

    expect(password1).toHaveLength(32)
    expect(password2).toHaveLength(32)
    expect(password1).not.toEqual(password2)
  })
})
