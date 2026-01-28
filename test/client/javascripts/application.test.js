const mockInitAll = jest.fn()

jest.mock('@defra/forms-engine-plugin/shared.js', () => ({
  initAll: mockInitAll
}))

describe('Application client JS', () => {
  test('initAll initialises the shared plugin client', async () => {
    await import('~/src/client/javascripts/application.js')

    expect(mockInitAll).toHaveBeenCalledTimes(1)
  })
})
