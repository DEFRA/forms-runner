import pluginBlankie from '~/src/server/plugins/blankie.js'

describe('Server Blankie Plugin', () => {
  test('configuration options are correct', () => {
    const { options } = pluginBlankie

    expect(options).toEqual({
      defaultSrc: ['self'],
      fontSrc: ['self', 'data:'],
      frameSrc: ['self', 'data:'],
      connectSrc: ['self'],
      scriptSrc: ['self', 'unsafe-inline'],
      styleSrc: ['self', 'unsafe-inline'],
      imgSrc: ['self'],
      generateNonces: false
    })
  })
})
