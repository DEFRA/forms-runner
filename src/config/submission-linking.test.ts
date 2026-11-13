import { config } from '~/src/config/index.js'

describe('submission linking configuration', () => {
  const original = process.env.SUBMISSION_LINKING_ALLOWED_FORMS

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SUBMISSION_LINKING_ALLOWED_FORMS
    } else {
      process.env.SUBMISSION_LINKING_ALLOWED_FORMS = original
    }
    jest.resetModules()
  })

  /**
   * Loads the config again, with the allowed forms set to the given value
   */
  async function loadWith(value: string) {
    process.env.SUBMISSION_LINKING_ALLOWED_FORMS = value
    jest.resetModules()

    const fresh = await import('~/src/config/index.js')

    return fresh.config.get('submissionLinking.allowedForms')
  }

  it('allows no forms by default', () => {
    expect(config.default('submissionLinking.allowedForms')).toEqual([])
  })

  it('reads an empty value as no forms', async () => {
    await expect(loadWith(' ')).resolves.toEqual([])
  })

  it('reads a JSON array of forms, with or without a name', async () => {
    const forms = [
      { formId: 'form-1', formName: 'Order a pizza' },
      { formId: 'form-2', formName: '' },
      { formId: 'form-3', formName: null },
      { formId: 'form-4' }
    ]

    await expect(loadWith(JSON.stringify(forms))).resolves.toEqual(forms)
  })

  it.each([
    ['a value that is not JSON', 'form-1,form-2'],
    ['a JSON value that is not an array', '{"formId":"form-1"}']
  ])('refuses %s', async (_name, value) => {
    await expect(loadWith(value)).rejects.toThrow(
      'must be a JSON array of allowed forms'
    )
  })

  it.each([
    ['a form with no ID', '[{"formName":"Order a pizza"}]'],
    [
      'a form with a name that is not a string',
      '[{"formId":"form-1","formName":1}]'
    ],
    ['the same form twice', '[{"formId":"form-1"},{"formId":"form-1"}]'],
    ['an entry that is not a form', '["form-1"]']
  ])('refuses %s', async (_name, value) => {
    await expect(loadWith(value)).rejects.toThrow(
      'must be a list of allowed forms'
    )
  })
})
