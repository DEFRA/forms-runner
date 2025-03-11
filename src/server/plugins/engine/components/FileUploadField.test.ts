import {
  ComponentType,
  type FileUploadFieldComponent
} from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { tempItemSchema } from '~/src/server/plugins/engine/components/FileUploadField.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  createPage,
  type PageControllerClass
} from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { validationOptions as opts } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  FileStatus,
  UploadStatus,
  type UploadState
} from '~/src/server/plugins/engine/types.js'
import definition from '~/test/form/definitions/file-upload-basic.js'
import { getFormData, getFormState } from '~/test/helpers/component-helpers.js'

describe('FileUploadField', () => {
  let model: FormModel

  const validTempState: UploadState = [
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

  const validState: UploadState = [
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
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: FileUploadFieldComponent
    let page: PageControllerClass
    let collection: ComponentCollection
    let field: Field

    beforeEach(() => {
      def = {
        title: 'Example file upload field',
        name: 'myComponent',
        type: ComponentType.FileUploadField,
        options: {},
        schema: {}
      } satisfies FileUploadFieldComponent

      page = createPage(model, definition.pages[0])
      collection = new ComponentCollection([def], { page, model })
      field = collection.fields[0]
    })

    describe('Schema', () => {
      it('uses component title as label', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(keys).toHaveProperty(
          'myComponent',
          expect.objectContaining({
            flags: expect.objectContaining({
              label: 'Example file upload field'
            })
          })
        )
      })

      it('uses component name as keys', () => {
        const { formSchema } = collection
        const { keys } = formSchema.describe()

        expect(field.keys).toEqual(['myComponent'])
        expect(field.collection).toBeUndefined()

        for (const key of field.keys) {
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
          { model }
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
        const result2 = tempItemSchema.validate(validTempState[0], opts)
        const result3 = tempItemSchema.validate(validTempState[1], opts)
        const result4 = tempItemSchema.validate(validTempState[2], opts)

        expect(result1.errors).toBeUndefined()
        expect(result2.error).toBeUndefined()
        expect(result3.error).toBeUndefined()
        expect(result4.error).toBeUndefined()
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

        const answer1 = getAnswer(field, state1)
        const answer2 = getAnswer(field, state2)

        expect(answer1).toBe('Uploaded 3 files')
        expect(answer2).toBe('')
      })

      it('returns payload from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const payload1 = field.getFormDataFromState(state1)
        const payload2 = field.getFormDataFromState(state2)

        expect(payload1).toEqual(getFormData(validState))
        expect(payload2).toEqual(getFormData())
      })

      it('returns value from state', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const value1 = field.getFormValueFromState(state1)
        const value2 = field.getFormValueFromState(state2)

        expect(value1).toBe(validState)
        expect(value2).toBeUndefined()
      })

      it('returns context for conditions and form submission', () => {
        const state1 = getFormState(validState)
        const state2 = getFormState(null)

        const value1 = field.getContextValueFromState(state1)
        const value2 = field.getContextValueFromState(state2)

        const { file: file1 } = validState[0].status.form
        const { file: file2 } = validState[1].status.form
        const { file: file3 } = validState[2].status.form

        expect(value1).toEqual([file1.fileId, file2.fileId, file3.fileId])
        expect(value2).toBeNull()
      })

      it('returns state from payload', () => {
        const payload1 = getFormData(validState)
        const payload2 = getFormData()

        const value1 = field.getStateFromValidForm(payload1)
        const value2 = field.getStateFromValidForm(payload2)

        expect(value1).toEqual(getFormState(validState))
        expect(value2).toEqual(getFormState(null))
      })
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = field.getViewModel(getFormData(validState))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 3,
              summaryList: {
                classes: 'govuk-summary-list--long-key',
                rows: [
                  {
                    key: {
                      html: expect.stringContaining('SampleJPGImage_30mbmb.jpg')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: [
                        {
                          href: `/test/file-upload-component/${validState[0].uploadId}/confirm-delete`,
                          text: 'Remove',
                          attributes: { id: 'myComponent__0' },
                          classes: 'govuk-link--no-visited-state',
                          visuallyHiddenText: 'SampleJPGImage_30mbmb.jpg'
                        }
                      ]
                    }
                  },
                  {
                    key: {
                      html: expect.stringContaining('error-messages.txt')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: [
                        {
                          href: `/test/file-upload-component/${validState[1].uploadId}/confirm-delete`,
                          text: 'Remove',
                          attributes: { id: 'myComponent__1' },
                          classes: 'govuk-link--no-visited-state',
                          visuallyHiddenText: 'error-messages.txt'
                        }
                      ]
                    }
                  },
                  {
                    key: {
                      html: expect.stringContaining('SampleJPGImage_20mbmb.jpg')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: [
                        {
                          href: `/test/file-upload-component/${validState[2].uploadId}/confirm-delete`,
                          text: 'Remove',
                          attributes: { id: 'myComponent__2' },
                          classes: 'govuk-link--no-visited-state',
                          visuallyHiddenText: 'SampleJPGImage_20mbmb.jpg'
                        }
                      ]
                    }
                  }
                ]
              }
            }
          })
        )
      })

      it('sets Nunjucks component defaults (preview URL direct access)', () => {
        const viewModel = field.getViewModel(
          getFormData(validState),
          undefined,

          // Preview URL '?force'
          { force: '' }
        )

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 3,
              summaryList: {
                classes: 'govuk-summary-list--long-key',
                rows: [
                  {
                    key: {
                      html: expect.stringContaining('SampleJPGImage_30mbmb.jpg')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: []
                    }
                  },
                  {
                    key: {
                      html: expect.stringContaining('error-messages.txt')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: []
                    }
                  },
                  {
                    key: {
                      html: expect.stringContaining('SampleJPGImage_20mbmb.jpg')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: []
                    }
                  }
                ]
              }
            }
          })
        )
      })

      it('sets Nunjucks component defaults with temp valid state', () => {
        const viewModel = field.getViewModel(getFormData(validTempState))

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 1,
              summaryList: {
                classes: 'govuk-summary-list--long-key',
                rows: [
                  {
                    key: {
                      html: expect.stringContaining('SampleJPGImage_20mbmb.jpg')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: [
                        {
                          href: `/test/file-upload-component/${validState[2].uploadId}/confirm-delete`,
                          text: 'Remove',
                          attributes: { id: 'myComponent__0' },
                          classes: 'govuk-link--no-visited-state',
                          visuallyHiddenText: 'SampleJPGImage_20mbmb.jpg'
                        }
                      ]
                    }
                  }
                ]
              }
            }
          })
        )
      })

      it('sets Nunjucks component defaults with temp valid state with errors (on POST)', () => {
        const viewModel = field.getViewModel(getFormData(validTempState), [])

        expect(viewModel).toEqual(
          expect.objectContaining({
            label: { text: def.title },
            name: 'file', // hardcoded to 'file' for CDP
            id: 'myComponent',
            value: '', // input type=file can't have a default value
            upload: {
              count: 1,
              summaryList: {
                classes: 'govuk-summary-list--long-key',
                rows: [
                  {
                    key: {
                      html: expect.stringContaining('SampleJPGImage_20mbmb.jpg')
                    },
                    value: {
                      html: expect.stringContaining('Uploaded')
                    },
                    actions: {
                      items: [
                        {
                          href: `/test/file-upload-component/${validState[2].uploadId}/confirm-delete`,
                          text: 'Remove',
                          attributes: { id: 'myComponent__0' },
                          classes: 'govuk-link--no-visited-state',
                          visuallyHiddenText: 'SampleJPGImage_20mbmb.jpg'
                        }
                      ]
                    }
                  }
                ]
              }
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
        collection = new ComponentCollection([def], { model })
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
