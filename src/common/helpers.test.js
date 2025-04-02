import { isPathRelative } from '~/src/common/helpers.js'

describe('isPathRelative', () => {
  test('should return true for absolute paths', () => {
    expect(isPathRelative('/absolute/path')).toBe(true)
  })

  test('should return false for relative paths', () => {
    expect(isPathRelative('relative/path')).toBe(false)
  })

  test('should return false for empty string', () => {
    expect(isPathRelative('')).toBe(false)
  })
})
