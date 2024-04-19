import {
  FormModel,
  SummaryViewModel
} from '../../../../../src/server/plugins/engine/models/index.js'
import config from '../../../../../src/server/config.js'
import form from './SummaryViewModel.json' with { type: 'json' }

describe('SummaryViewModel', () => {
  test('returns the correct apiKey', async () => {
    jest.replaceProperty(config, 'apiEnv', 'test')

    const formModel = new FormModel(form, {})
    const viewModel = new SummaryViewModel(
      'summary',
      formModel,
      {
        progress: []
      },
      {
        app: {
          location: '/'
        },
        query: {},
        state: {
          cookie_policy: {}
        }
      }
    )
    expect(viewModel.payApiKey).toBe('test_api_key')
    jest.replaceProperty(config, 'apiEnv', 'production')
    expect(viewModel.payApiKey).toBe('production_api_key')
  })
})
