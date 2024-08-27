import {
  ComponentType,
  type FormDefinition,
  type FileUploadFieldComponent
} from '@defra/forms-model'

import {
  FileUploadField,
  tempItemSchema
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'

describe('FileUploadFieldComponent', () => {
  const definition = {
    pages: [],
    lists: [],
    sections: [],
    conditions: []
  } satisfies FormDefinition

  let formModel: FormModel

  const validTempState = [
    {
      uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69',
      status: {
        uploadStatus: 'pending',
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'fcb4f0f8-6862-4836-86dc-f56ff900b0ff',
            filename: 'SampleJPGImage_30mbmb.jpg',
            fileStatus: 'pending',
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
        uploadStatus: 'ready',
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'e1d6cf98-35a7-4f97-8a28-cdd2b115d8fa',
            filename: 'virus.txt',
            fileStatus: 'rejected',
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
        uploadStatus: 'ready',
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: '71fb359c-dee7-4c2e-8701-239eb892765a',
            filename: 'SampleJPGImage_20mbmb.jpg',
            fileStatus: 'complete',
            contentLength: 21348301
          }
        },
        numberOfRejectedFiles: 0
      }
    }
  ]

  const validState = [
    {
      uploadId: '3075efea-e5de-476f-a0bf-9ae7ef56ca69',
      status: {
        uploadStatus: 'ready',
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'fcb4f0f8-6862-4836-86dc-f56ff900b0ff',
            filename: 'SampleJPGImage_30mbmb.jpg',
            fileStatus: 'complete',
            contentLength: 30789588
          }
        },
        numberOfRejectedFiles: 0
      }
    },
    {
      uploadId: 'c7e8c8f1-fa5b-4587-966a-96066c6356bb',
      status: {
        uploadStatus: 'ready',
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: 'e1d6cf98-35a7-4f97-8a28-cdd2b115d8fa',
            filename: 'error-messages.txt',
            fileStatus: 'complete',
            contentLength: 9662
          }
        },
        numberOfRejectedFiles: 0
      }
    },
    {
      uploadId: 'ec9f9b26-76c6-4ede-8aaa-3d4e02fe9984',
      status: {
        uploadStatus: 'ready',
        metadata: {
          retrievalKey: 'enrique.chase@defra.gov.uk'
        },
        form: {
          file: {
            fileId: '71fb359c-dee7-4c2e-8701-239eb892765a',
            filename: 'SampleJPGImage_20mbmb.jpg',
            fileStatus: 'complete',
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
    let component: FileUploadField
    let label: string

    beforeEach(() => {
      def = {
        title: 'Example file upload field',
        name: 'myComponent',
        type: ComponentType.FileUploadField,
        options: {},
        schema: {}
      } satisfies FileUploadFieldComponent

      component = new FileUploadField(def, formModel)
      label = def.title.toLowerCase()
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = component

        expect(formSchema.describe().flags).toEqual(
          expect.objectContaining({ label })
        )
      })

      it('is required by default', () => {
        const { formSchema } = component

        expect(formSchema.describe().flags).toEqual(
          expect.objectContaining({
            presence: 'required'
          })
        )
      })

      it('is optional when configured', () => {
        const componentOptional = new FileUploadField(
          { ...def, options: { required: false } },
          formModel
        )

        const { formSchema } = componentOptional

        expect(formSchema.describe().flags).toEqual(
          expect.objectContaining({
            presence: 'optional'
          })
        )

        const result = formSchema.validate(undefined, opts)
        expect(result.error).toBeUndefined()
      })

      it('accepts valid values', () => {
        const { formSchema, stateSchema } = component

        const result1 = formSchema.validate(validState, opts)
        const result2 = stateSchema.validate(validState, opts)
        const result3 = tempItemSchema.validate(validTempState[0], opts)
        const result4 = tempItemSchema.validate(validTempState[1], opts)
        const result5 = tempItemSchema.validate(validTempState[2], opts)

        expect(result1.error).toBeUndefined()
        expect(result2.error).toBeUndefined()
        expect(result3.error).toBeUndefined()
        expect(result4.error).toBeUndefined()
        expect(result5.error).toBeUndefined()
      })

      it('adds errors for empty value', () => {
        const { formSchema } = component

        const result = formSchema.validate(null, opts)

        expect(result.error).toEqual(
          expect.objectContaining({
            message: `Select ${label}`
          })
        )
      })

      it('adds errors for invalid values', () => {
        const { formSchema } = component

        const result1 = formSchema.validate(['invalid'], opts)
        const result2 = formSchema.validate({ unknown: 'invalid' }, opts)

        expect(result1.error).toBeTruthy()
        expect(result2.error).toBeTruthy()
      })
    })

    describe('State', () => {
      it('Returns text from state value', () => {
        const text = component.getDisplayStringFromState({
          [def.name]: [{}, {}]
        })
        expect(text).toBe('You uploaded 2 files')
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = component.getViewModel({
          [def.name]: validState
        })
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
        const viewModel = component.getViewModel({
          [def.name]: validTempState
        })
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
          {
            [def.name]: validTempState
          },
          {
            titleText: 'There is a problem',
            errorList: []
          }
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
            input: [],
            output: {
              value: [],
              error: new Error(
                'example file upload field must contain at least 1 items'
              )
            }
          },
          {
            input: validState,
            output: {
              value: validState,
              error: new Error(
                'example file upload field must contain less than or equal to 2 items'
              )
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
            input: [],
            output: {
              value: [],
              error: new Error('example file upload field must contain 4 items')
            }
          },
          {
            input: validState,
            output: {
              value: validState,
              error: new Error('example file upload field must contain 4 items')
            }
          },
          {
            input: [...validState, ...validState],
            output: {
              value: [...validState, ...validState],
              error: new Error('example file upload field must contain 4 items')
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
            input: [],
            output: {
              value: []
            }
          },
          {
            input: null,
            output: {
              value: undefined
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
            input: null,
            output: {
              value: undefined
            }
          },
          {
            input: [],
            output: {
              value: [],
              error: new Error(
                'example file upload field must contain at least 1 items'
              )
            }
          },
          {
            input: validState,
            output: {
              value: validState,
              error: new Error(
                'example file upload field must contain less than or equal to 2 items'
              )
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
            input: null,
            output: {
              value: undefined
            }
          },
          {
            input: [],
            output: {
              value: [],
              error: new Error('example file upload field must contain 4 items')
            }
          },
          {
            input: validState,
            output: {
              value: validState,
              error: new Error('example file upload field must contain 4 items')
            }
          },
          {
            input: [...validState, ...validState],
            output: {
              value: [...validState, ...validState],
              error: new Error('example file upload field must contain 4 items')
            }
          }
        ]
      }
    ])('$description', ({ component: def, assertions }) => {
      let component: FileUploadField
      let label: string
      beforeEach(() => {
        component = new FileUploadField(def, formModel)
        label = def.title.toLowerCase()
      })
      it('validates empty value', () => {
        const { formSchema } = component
        const input = null
        const output = {
          value: undefined,
          error:
            component.options.required === false
              ? undefined
              : new Error(`Select ${label}`)
        }
        const result = formSchema.validate(input, opts)
        expect(result).toEqual(output)
      })
      it.each([...assertions])(
        'validates custom example',
        ({ input, output }) => {
          const { formSchema } = component
          const result = formSchema.validate(input, opts)
          expect(result).toEqual(output)
        }
      )
    })
  })
})
