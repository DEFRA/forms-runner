import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PlaybackUploadPageController } from '~/src/server/plugins/engine/pageControllers/PlaybackUploadPageController.js'
import { UploadPageController } from '~/src/server/plugins/engine/pageControllers/UploadPageController.js'

jest.mock(
  '../../../../../../src/server/plugins/engine/pageControllers/PlaybackUploadPageController'
)

describe('UploadPageController', () => {
  const def = {
    title: 'Your birth certificate',
    path: '/your-birth-certificate',
    name: '',
    components: [
      {
        name: 'imageUpload',
        options: {
          required: true
        },
        type: 'FileUploadField',
        title: 'Birth certificate',
        schema: {}
      }
    ],
    next: [
      {
        path: '/second-page'
      }
    ],
    controller: 'UploadPageController'
  }

  const model = new FormModel(
    {
      pages: [],
      startPage: '/start',
      sections: [],
      lists: [],
      conditions: []
    },
    {}
  )

  beforeAll(() => {
    jest
      .spyOn(PlaybackUploadPageController.prototype, 'makePostRouteHandler')
      .mockReturnValue(async () => true)

    jest
      .spyOn(PlaybackUploadPageController.prototype, 'makeGetRouteHandler')
      .mockReturnValue(async () => true)
  })

  test('Redirects post handler to the playback page post handler when view=playback', async () => {
    const pageController = new UploadPageController(model, def)
    const request = {
      query: {
        view: 'playback'
      }
    }
    const result = await pageController.makePostRouteHandler()(request, {})
    expect(result).toBe(true)
  })
  test('Redirects get handler to the playback page get handler when view=playback', async () => {
    const pageController = new UploadPageController(model, def)
    const request = {
      query: {
        view: 'playback'
      }
    }
    const result = await pageController.makeGetRouteHandler()(request, {})
    expect(result).toBe(true)
  })
})
