import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'

describe('relative url', () => {
  describe('constructor', () => {
    test('should throw error if the provided url is not relative', () => {
      expect(() => new RelativeUrl('http://www.badgers.com')).toThrow()
    })

    test('should throw error if the provided url is not relative when using the internal cheat url', () => {
      expect(() => new RelativeUrl('http://www.fishing.com')).toThrow()
    })

    test('should not throw an error when using a relative url', () => {
      const underTest = new RelativeUrl('bob')
      expect(underTest.toString()).toBe('bob')
    })

    test('should not throw an error when using a relative url with a leading /', () => {
      const underTest = new RelativeUrl('/bob')
      expect(underTest.toString()).toBe('/bob')
    })
  })

  describe('setParam', () => {
    test('should add a first param', () => {
      const underTest = new RelativeUrl('bob')
      underTest.setParam('myParam', 'myBadger')
      expect(underTest.toString()).toBe('bob?myParam=myBadger')
    })

    test('should add a second param', () => {
      const underTest = new RelativeUrl('bob')
      underTest.setParam('myParam', 'myBadger')
      underTest.setParam('myParam2', 'myBadger2')
      expect(underTest.toString()).toBe(
        'bob?myParam=myBadger&myParam2=myBadger2'
      )
    })

    test('should add a second param to an existing query string', () => {
      const underTest = new RelativeUrl('bob?myParam=myBadger')
      underTest.setParam('myParam2', 'myBadger2')
      expect(underTest.toString()).toBe(
        'bob?myParam=myBadger&myParam2=myBadger2'
      )
    })

    test('should overwrite param of the same name', () => {
      const underTest = new RelativeUrl('bob?myParam=myBadger')
      underTest.setParam('myParam', 'myBadger2')
      expect(underTest.toString()).toBe('bob?myParam=myBadger2')
    })
  })

  describe('getParam', () => {
    test('should get a param', () => {
      const underTest = new RelativeUrl('bob?myParam=myBadger')
      expect(underTest.getParam('myParam')).toBe('myBadger')
    })

    test('should return null if the param does not exist', () => {
      const underTest = new RelativeUrl('bob')
      expect(underTest.getParam('myParam')).toBeNull()
    })
  })
})
