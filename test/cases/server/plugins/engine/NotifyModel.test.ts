import {
  FormModel,
  SummaryViewModel
} from '../../../../../src/server/plugins/engine/models/index.js'
import form from './NotifyViewModel.json' with { type: 'json' }

describe('NotifyModel', () => {
  const baseState = {
    progress: ['/test/first-page'],
    aSection: {
      caz: 1,
      name: 'Jen',
      emailAddress: 'beep.boop@somewh.ere'
    }
  }

  const request = {
    app: {
      location: '/'
    },
    query: {},
    state: {
      cookie_policy: {}
    }
  }

  const formModel = new FormModel(form, {})
  formModel.basePath = 'test'
  formModel.name = 'My Service'

  test('SummaryViewModel returns a correct NotifyModel', () => {
    const viewModel = new SummaryViewModel(
      'summary',
      formModel,
      baseState,
      request
    )
    const { outputData } = viewModel.outputs[0]

    expect(outputData).toEqual({
      templateId: 'some-template-id',
      personalisation: { 'aSection.name': 'Jen', nameIsJen: true },
      emailAddress: 'beep.boop@somewh.ere',
      apiKey: { test: 'testKey', production: 'productionKey' },
      addReferencesToPersonalisation: true,
      emailReplyToId: 'default-email-id'
    })
  })

  test('Returns the correct emailReplyToId', () => {
    const viewModel = new SummaryViewModel(
      'summary',
      formModel,
      { ...baseState, aSection: { ...baseState.aSection, caz: 2 } },
      request
    )
    const { outputData } = viewModel.outputs[0]
    expect(outputData).toEqual(
      expect.objectContaining({
        emailReplyToId: 'bristol-email-id'
      })
    )
  })
})
