const mockInitMaps = jest.fn()

jest.mock('@defra/forms-engine-plugin/shared.js', () => ({
  initMaps: mockInitMaps
}))

describe('Maps client JS', () => {
  test('initMaps initialises the maps plugin client', async () => {
    await import('~/src/client/javascripts/maps.js')

    expect(mockInitMaps).toHaveBeenCalledTimes(1)
  })
})
