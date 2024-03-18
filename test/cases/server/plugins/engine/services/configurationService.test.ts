import { loadPreConfiguredForms } from '../../../../../../src/server/plugins/engine/services/configurationService'
import testFormJSON from '../../../../../../src/server/forms/test.json' with { type: 'json' }
import reportFormJSON from '../../../../../../src/server/forms/report-a-terrorist.json' with { type: 'json' }

describe('Engine Plugin ConfigurationService', () => {
  test('it loads pre-configured forms configuration correctly ', () => {
    const result = loadPreConfiguredForms()

    expect(result).toEqual(
      expect.arrayContaining([
        {
          configuration: testFormJSON,
          id: 'test'
        },
        {
          id: 'report-a-terrorist',
          configuration: reportFormJSON
        }
      ])
    )
  })
})
