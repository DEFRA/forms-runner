import {
  ComponentType,
  type FileUploadFieldComponent,
  type FormDefinition
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { tempItemSchema } from '~/src/server/plugins/engine/components/FileUploadField.js'
import { type FormComponentFieldClass } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  FileStatus,
  UploadStatus,
  type FileState
} from '~/src/server/plugins/engine/types.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('FileUploadField', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel

  const validTempState: FileState[] = [
    {
      uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69',
      status: {
        uploadStatus: UploadStatus.pending,
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'fcb4f0f8-6862-4836-86dc-f56ff900b0ff',
            filename: 'SampleJPGImage_30mbmb.jpg',
            fileStatus: FileStatus.pending,
            contentLength: 30789588,
            errorMessage: 'The selected file has not fully uploaded'
          }
        },
        numberOfRejectedFiles: 0
      }
    },
    {
      uploadId: 'c7e8c8f1-fa5b-4587-966a-96066c6356bb',
      status: {
        uploadStatus: UploadStatus.ready,
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'e1d6cf98-35a7-4f97-8a28-cdd2b115d8fa',
            filename: 'virus.txt',
            fileStatus: FileStatus.rejected,
            contentLength: 9662,
            errorMessage: 'The selected file contains a virus'
          }
        },
        numberOfRejectedFiles: 1
      }
    },
    {
      uploadId: 'ec9f9b26-76c6-4ede-8aaa-3d4e02fe9984',
      status: {
        uploadStatus: UploadStatus.ready,
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: '71fb359c-dee7-4c2e-8701-239eb892765a',
            filename: 'SampleJPGImage_20mbmb.jpg',
            fileStatus: FileStatus.complete,
            contentLength: 21348301
          }
        },
        numberOfRejectedFiles: 0
      }
    }
  ]

  const validState: FileState[] = [
    {
      uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69',
      status: {
        uploadStatus: UploadStatus.ready,
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'fcb4f0f8-6862-4836-86dc-f56ff900b0ff',
            filename: 'SampleJPGImage_30mbmb.jpg',
            fileStatus: FileStatus.complete,
            contentLength: 30789588
          }
        },
        numberOfRejectedFiles: 0
      }
    },
    {
      uploadId: 'c7e8c8f1-fa5b-4587-966a-96066c6356bb',
      status: {
        uploadStatus: UploadStatus.ready,
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'e1d6cf98-35a7-4f97-8a28-cdd2b115d8fa',
            filename: 'error-messages.txt',
            fileStatus: FileStatus.complete,
            contentLength: 9662
          }
        },
        numberOfRejectedFiles: 0
      }
    },
    {
      uploadId: 'ec9f9b26-76c6-4ede-8aaa-3d4e02fe9984',
      status: {
        uploadStatus: UploadStatus.ready,
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: '71fb359c-dee7-4c2e-8701-239eb892765a',
            filename: 'SampleJPGImage_20mbmb.jpg',
            fileStatus: FileStatus.complete,
            contentLength: 21348301
          }
        },
        numberOfRejectedFiles: 0
      }
    }
  ]

  beforeEach(() => {
    formModel = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: FileUploadFieldComponent
    let collection: ComponentCollection
    let component: FormComponentFieldClass

    beforeEach(() => {
      def = {
        title: 'Example file upload field',
        name: 'myComponent',
        type: ComponentType.FileUploadField,
        options: {},
        schema: {}
      } satisfies FileUploadFieldComponent

      collection = new ComponentCollection([def], { model: formModel })
      component = collection.formItems[0]
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'example file upload field'
            })
          })
        )
      })

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(component.keys).toEqual(['myComponent'])
        expect(component.children).toBeUndefined()

        for (const key of component.keys) {
          expect(keys).toHaveProperty(key)
        }
      })

      it('is required by default', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              presence: 'required'
            })
          })
        )
      })

      it('is optional when configured', () => {
        const collectionOptional = new ComponentCollection(
          [{ ...def, options: { required: false } }],
          { model: formModel }
        )

        const { formSchema } = collectionOptional
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              presence: 'optional'
            })
          })
        )

        const result = collectionOptional.validate(getFormData())
        expect(result.errors).toBeUndefined()
      })

      it('accepts valid values', () => {
        const result1 = collection.validate(getFormData(validState))
        const result2 = collection.validate(
          getFormState(validState),
          'stateSchema'
        )

        const result3 = tempItemSchema.validate(validTempState[0], opts)
        const result4 = tempItemSchema.validate(validTempState[1], opts)
        const result5 = tempItemSchema.validate(validTempState[2], opts)

        expect(result1.errors).toBeUndefined()
        expect(result2.errors).toBeUndefined()

        expect(result3.error).toBeUndefined()
        expect(result4.error).toBeUndefined()
        expect(result5.error).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const result = collection.validate(getFormData())

        expect(result.errors).toEqual([
          expect.objectContaining({
            text: 'Select example file upload field'
          })
        ])
      })

      it('adds errors for invalid values', () => {
        const result1 = collection.validate(getFormData(['invalid']))
        const result2 = collection.validate(
          // @ts-expect-error - Allow invalid param for test
          getFormData({ unknown: 'invalid' })
        )

        expect(result1.errors).toBeTruthy()
        expect(result2.errors).toBeTruthy()
      })
    })

    describe('State', () => {
      it('returns text from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const text1 = component.getDisplayStringFromState(state1)
        const text2 = component.getDisplayStringFromState(state2)

        expect(text1).toBe('You uploaded 3 files')
        expect(text2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const payload1 = component.getFormDataFromState(state1)
        const payload2 = component.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(validState))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const value1 = component.getFormValueFromState(state1)
        const value2 = component.getFormValueFromState(state2)

        expect(value1).toBe(validState)
        expect(value2).toBeUndefined()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(validState)
        const payload2 = getFormData()

        const value1 = component.getStateFromValidForm(payload1)
        const value2 = component.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(validState))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel(getFormData(validState))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 3,
              pendingCount: 0,
              successfulCount: 3,
              summary: [
                {
                  name: 'SampleJPGImage_30mbmb.jpg',
                  size: '30.8 MB',
                  tag: {
                    classes: 'govuk-tag--green',
                    text: 'Uploaded'
                  },
                  uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69'
                },
                {
                  name: 'error-messages.txt',
                  size: '9.7 kB',
                  tag: {
                    classes: 'govuk-tag--green',
                    text: 'Uploaded'
                  },
                  uploadId: 'c7e8c8f1-fa5b-4587-966a-96066c6356bb'
                },
                {
                  name: 'SampleJPGImage_20mbmb.jpg',
                  size: '21.3 MB',
                  tag: {
                    classes: 'govuk-tag--green',
                    text: 'Uploaded'
                  },
                  uploadId: 'ec9f9b26-76c6-4ede-8aaa-3d4e02fe9984'
                }
              ]
            }
          })
        )
      })

      it('sets Nunjucks component defaults with temp valid state', () => {
        const viewModel = component.getViewModel(getFormData(validTempState))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 3,
              pendingCount: 1,
              successfulCount: 1,
              summary: [
                {
                  name: 'SampleJPGImage_30mbmb.jpg',
                  size: '30.8 MB',
                  tag: {
                    classes: 'govuk-tag--yellow',
                    text: 'Uploading'
                  },
                  uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69'
                },
                {
                  name: 'virus.txt',
                  size: '9.7 kB',
                  tag: {
                    classes: 'govuk-tag--red',
                    text: 'Error'
                  },
                  uploadId: 'c7e8c8f1-fa5b-4587-966a-96066c6356bb'
                },
                {
                  name: 'SampleJPGImage_20mbmb.jpg',
                  size: '21.3 MB',
                  tag: {
                    classes: 'govuk-tag--green',
                    text: 'Uploaded'
                  },
                  uploadId: 'ec9f9b26-76c6-4ede-8aaa-3d4e02fe9984'
                }
              ]
            }
          })
        )
      })

      it('sets Nunjucks component defaults with temp valid state with errors (on POST)', () => {
        const viewModel = component.getViewModel(
          getFormData(validTempState),
          []
        )

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 3,
              pendingCount: 1,
              successfulCount: 1,
              summary: [
                {
                  name: 'SampleJPGImage_30mbmb.jpg',
                  size: '30.8 MB',
                  tag: {
                    classes: 'govuk-tag--yellow',
                    text: 'Uploading'
                  },
                  uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69',
                  errorMessage: 'The selected file has not fully uploaded'
                },
                {
                  name: 'virus.txt',
                  size: '9.7 kB',
                  tag: {
                    classes: 'govuk-tag--red',
                    text: 'Error'
                  },
                  uploadId: 'c7e8c8f1-fa5b-4587-966a-96066c6356bb',
                  errorMessage: 'The selected file contains a virus'
                },
                {
                  name: 'SampleJPGImage_20mbmb.jpg',
                  size: '21.3 MB',
                  tag: {
                    classes: 'govuk-tag--green',
                    text: 'Uploaded'
                  },
                  uploadId: 'ec9f9b26-76c6-4ede-8aaa-3d4e02fe9984'
                }
              ]
            }
          })
        )
      })
    })
  })

  describe('Validation', () => {
    describe.each([
      {
        description: 'Schema min and max',
        component: {
          title: 'Example file upload field',
          name: 'myComponent',
          type: ComponentType.FileUploadField,
          options: {},
          schema: {
            min: 1,
            max: 2
          }
        } satisfies FileUploadFieldComponent,
        assertions: [
          {
            input: getFormData([]),
            output: {
              value: getFormData([]),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain at least 1 items'
                })
              ]
            }
          },
          {
            input: getFormData(validState),
            output: {
              value: getFormData(validState),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain less than or equal to 2 items'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Schema length',
        component: {
          title: 'Example file upload field',
          name: 'myComponent',
          type: ComponentType.FileUploadField,
          options: {},
          schema: {
            length: 4
          }
        } satisfies FileUploadFieldComponent,
        assertions: [
          {
            input: getFormData([]),
            output: {
              value: getFormData([]),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain 4 items'
                })
              ]
            }
          },
          {
            input: getFormData(validState),
            output: {
              value: getFormData(validState),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain 4 items'
                })
              ]
            }
          },
          {
            input: getFormData([...validState, ...validState]),
            output: {
              value: getFormData([...validState, ...validState]),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain 4 items'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional',
        component: {
          title: 'Example file upload field',
          name: 'myComponent',
          type: ComponentType.FileUploadField,
          options: {
            required: false
          },
          schema: {}
        } satisfies FileUploadFieldComponent,
        assertions: [
          {
            input: getFormData([]),
            output: {
              value: getFormData([])
            }
          },
          {
            input: getFormData(),
            output: {
              value: getFormData()
            }
          }
        ]
      },
      {
        description: 'Optional schema min and max',
        component: {
          title: 'Example file upload field',
          name: 'myComponent',
          type: ComponentType.FileUploadField,
          options: {
            required: false
          },
          schema: {
            min: 1,
            max: 2
          }
        } satisfies FileUploadFieldComponent,
        assertions: [
          {
            input: getFormData(),
            output: {
              value: getFormData()
            }
          },
          {
            input: getFormData([]),
            output: {
              value: getFormData([]),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain at least 1 items'
                })
              ]
            }
          },
          {
            input: getFormData(validState),
            output: {
              value: getFormData(validState),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain less than or equal to 2 items'
                })
              ]
            }
          }
        ]
      },
      {
        description: 'Optional schema length',
        component: {
          title: 'Example file upload field',
          name: 'myComponent',
          type: ComponentType.FileUploadField,
          options: {
            required: false
          },
          schema: {
            length: 4
          }
        } satisfies FileUploadFieldComponent,
        assertions: [
          {
            input: getFormData(),
            output: {
              value: getFormData()
            }
          },
          {
            input: getFormData([]),
            output: {
              value: getFormData([]),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain 4 items'
                })
              ]
            }
          },
          {
            input: getFormData(validState),
            output: {
              value: getFormData(validState),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain 4 items'
                })
              ]
            }
          },
          {
            input: getFormData([...validState, ...validState]),
            output: {
              value: getFormData([...validState, ...validState]),
              errors: [
                expect.objectContaining({
                  text: 'Example file upload field must contain 4 items'
                })
              ]
            }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let collection: ComponentCollection

      beforeEach(() => {
        collection = new ComponentCollection([def], { model: formModel })
      })

      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const result = collection.validate(input)
          expect(result).toEqual(output)
        }
      )
    })
  })
})
