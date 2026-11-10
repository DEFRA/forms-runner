import { FormStatus } from '@defra/forms-engine-plugin/types'
import { ComponentType } from '@defra/forms-model'

import {
  isString,
  mapValueToState,
  rehydrateRepeaters
} from '~/src/server/utils/map-submission-to-state.js'

const emptyDefinition = /** @type {FormDefinition} */ ({
  pages: [],
  lists: [],
  conditions: [],
  sections: []
})

describe('mapValueToState', () => {
  it('should map adaptor v2 message to state2', () => {
    /**
     * @type {import('~/src/server/services/submissionService.js').FormSubmissionDocument}
     */
    const message = {
      meta: {
        schemaVersion: 1,
        timestamp: new Date('2026-11-02T13:23:27.175Z'),
        referenceNumber: '6U2-AML-75L',
        formName: 'Components',
        formId: '6a61e01bb001f0de83297a2f',
        formSlug: 'components',
        status: FormStatus.Draft,
        isPreview: true,
        notificationEmail: 'enrique.chase@defra.gov.uk',
        language: 'en-GB',
        versionMetadata: {
          versionNumber: 37,
          createdAt: new Date('2026-10-20T14:19:38.947Z')
        },
        auth: {
          sub: '619bc9d1-c4b9-4562-8f66-20342a053291',
          issuer: 'http://identity.127.0.0.1.sslip.io:3011'
        }
      },
      data: {
        main: {
          textField: 'Bob',
          multilineTextField: 'Blah',
          numberField: 2,
          datePartsField: {
            day: 1,
            month: 1,
            year: 2001
          },
          yesNoField: true,
          emailAddressField: 'davidjamesstone@gmail.com',
          telephoneNumberField: '+447930696579',
          addressField: {
            uprn: '10000001',
            addressLine1: 'FOREST DENE',
            addressLine2: 'FOREST HILL',
            town: 'NORTHWICH',
            county: 'CHESHIRE',
            postcode: 'CW8 2AT'
          },
          radiosField: 'soleTrader',
          selectField: 910400015,
          checkboxesField: ['Arabian', 'Shire', 'Race'],
          monthYearField: {
            month: 1,
            year: 2001
          },
          autocompleteField: 'es',
          eastingNorthingField: {
            easting: 280930,
            northing: 354169
          },
          latLongField: {
            latitude: 54.5120943,
            longitude: -1.4277123
          },
          osGridRefField: 'SD 60137 91097',
          nationalGridFieldNumberField: 'NG 1234 5678',
          geospatialField: [
            {
              type: 'Feature',
              properties: {
                description: 'P1',
                coordinateGridReference: 'SD 98001 53872',
                centroidGridReference: 'SD 98001 53872'
              },
              geometry: {
                type: 'Point',
                coordinates: [-2.0319604, 53.9809063]
              },
              id: '3e16efa9-2358-4983-919d-90f876627fec'
            },
            {
              id: '5dccbbbf-37b1-449c-82e4-93586b8c1c6a',
              type: 'Feature',
              properties: {
                description: 'S1',
                coordinateGridReference: 'SD 82245 78282',
                centroidGridReference: 'SE 05918 60473'
              },
              geometry: {
                coordinates: [
                  [
                    [-2.2736596, 54.1999867],
                    [-2.2626732, 53.8579746],
                    [-1.5156029, 53.8514945],
                    [-1.5925072, 54.2513671],
                    [-2.2736596, 54.1999867]
                  ]
                ],
                type: 'Polygon'
              }
            },
            {
              id: '54089d33-7faf-44c5-9f42-66a600717f60',
              type: 'Feature',
              properties: {
                description: 'L1',
                coordinateGridReference: 'SD 85111 78272',
                centroidGridReference: 'SE 06996 61377'
              },
              geometry: {
                coordinates: [
                  [-2.2297143, 54.1999867],
                  [-1.5156029, 53.8709318],
                  [-1.5705346, 54.244948],
                  [-2.2626732, 53.8774089]
                ],
                type: 'LineString'
              }
            }
          ],
          SBdibf: 'Yo'
        },
        repeaters: {
          bRpVOv: [
            {
              PULqgd: 'Dad Chase',
              TKqbTU: {
                day: 1,
                month: 1,
                year: 2001
              },
              WffjBp: [
                {
                  type: 'Feature',
                  properties: {
                    description: 'I1P1',
                    coordinateGridReference: 'NY 79583 23832',
                    centroidGridReference: 'NY 79583 23832'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [-2.3176049, 54.6092417]
                  },
                  id: '3daa8d71-562a-4bfc-b82e-e65c4245083b'
                },
                {
                  id: 'b540809d-4340-46fc-9519-47730c3ff201',
                  type: 'Feature',
                  properties: {
                    description: 'I1S1',
                    coordinateGridReference: 'NY 48570 42452',
                    centroidGridReference: 'NY 75562 23765'
                  },
                  geometry: {
                    coordinates: [
                      [
                        [-2.8010033, 54.7743366],
                        [-2.2626732, 54.2513671],
                        [-2.0759057, 54.7996763],
                        [-2.8010033, 54.7743366]
                      ]
                    ],
                    type: 'Polygon'
                  }
                },
                {
                  id: '655057c3-f807-4f54-a3d3-ec50ccf694f0',
                  type: 'Feature',
                  properties: {
                    description: 'I1L1',
                    coordinateGridReference: 'SE 32658 87028',
                    centroidGridReference: 'SE 28298 76893'
                  },
                  geometry: {
                    coordinates: [
                      [-1.4999451, 54.2778594],
                      [-1.6357526, 54.096222]
                    ],
                    type: 'LineString'
                  }
                }
              ],
              MwZpks: {
                easting: 377416,
                northing: 516048
              }
            },
            {
              PULqgd: 'Mum Chase',
              TKqbTU: {
                day: 1,
                month: 1,
                year: 2001
              },
              WffjBp: [
                {
                  type: 'Feature',
                  properties: {
                    description: 'I2P1',
                    coordinateGridReference: 'NY 91648 24502',
                    centroidGridReference: 'NY 91648 24502'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [-2.1308373, 54.6156039]
                  },
                  id: 'e65f5b56-55f2-4bfe-92ae-fb49686f32a9'
                },
                {
                  id: '5b8e3ab6-a232-4f96-8029-eebb8996d9b3',
                  type: 'Feature',
                  properties: {
                    description: 'I2L1',
                    coordinateGridReference: 'SE 04457 83967',
                    centroidGridReference: 'SE 04799 57308'
                  },
                  geometry: {
                    coordinates: [
                      [-1.9330834, 54.2513671],
                      [-2.469669, 53.9729062],
                      [-1.3820225, 53.8110477]
                    ],
                    type: 'LineString'
                  }
                }
              ],
              MwZpks: {
                easting: 384534,
                northing: 518854
              }
            },
            {
              PULqgd: 'Child Chase',
              TKqbTU: {
                day: 1,
                month: 1,
                year: 2001
              },
              WffjBp: [
                {
                  type: 'Feature',
                  properties: {
                    description: 'I3P1',
                    coordinateGridReference: 'SD 57949 86300',
                    centroidGridReference: 'SD 57949 86300'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [-2.6471947, 54.2706182]
                  },
                  id: 'd644e928-4eff-40c8-a489-4274ce74525a'
                },
                {
                  id: '7eabb7c6-6358-49c3-8f25-8cc01f0e39e6',
                  type: 'Feature',
                  properties: {
                    description: 'I3S1',
                    coordinateGridReference: 'NY 50636 37489',
                    centroidGridReference: 'NY 78406 24962'
                  },
                  geometry: {
                    coordinates: [
                      [
                        [-2.7680443, 54.7299541],
                        [-2.4054955, 54.3347238],
                        [-1.8342064, 54.7933429],
                        [-2.7680443, 54.7299541]
                      ]
                    ],
                    type: 'Polygon'
                  }
                }
              ],
              MwZpks: {
                easting: 364853,
                northing: 453287
              }
            }
          ]
        },
        files: {
          fileUploadField: [
            {
              fileId: 'e30cacfe-7811-4e28-bbc8-173f4b6f84e8',
              fileName: 'space.jpeg',
              userDownloadLink:
                'http://localhost:3000/file-download/e30cacfe-7811-4e28-bbc8-173f4b6f84e8'
            }
          ]
        }
      },
      result: {
        files: {
          main: '86682bb3-22ec-42d0-bd98-7582fdc98dd8',
          repeaters: {
            bRpVOv: 'fe86f142-3cd9-4f65-bae2-239ccfdfc80b'
          }
        }
      },
      conditionEvaluations: [],
      recordCreatedAt: new Date('2026-11-02T13:23:28.461Z'),
      expireAt: new Date('2028-05-02T12:23:28.461Z')
    }

    expect(mapValueToState(message, emptyDefinition)).toEqual({
      textField: 'Bob',
      multilineTextField: 'Blah',
      numberField: 2,
      datePartsField__day: 1,
      datePartsField__month: 1,
      datePartsField__year: 2001,
      yesNoField: true,
      emailAddressField: 'davidjamesstone@gmail.com',
      telephoneNumberField: '+447930696579',
      addressField__uprn: '10000001',
      addressField__addressLine1: 'FOREST DENE',
      addressField__addressLine2: 'FOREST HILL',
      addressField__town: 'NORTHWICH',
      addressField__county: 'CHESHIRE',
      addressField__postcode: 'CW8 2AT',
      radiosField: 'soleTrader',
      selectField: 910400015,
      checkboxesField: ['Arabian', 'Shire', 'Race'],
      monthYearField__month: 1,
      monthYearField__year: 2001,
      autocompleteField: 'es',
      eastingNorthingField__easting: 280930,
      eastingNorthingField__northing: 354169,
      latLongField__latitude: 54.5120943,
      latLongField__longitude: -1.4277123,
      osGridRefField: 'SD 60137 91097',
      nationalGridFieldNumberField: 'NG 1234 5678',
      geospatialField: [
        {
          type: 'Feature',
          properties: {
            description: 'P1',
            coordinateGridReference: 'SD 98001 53872',
            centroidGridReference: 'SD 98001 53872'
          },
          geometry: {
            type: 'Point',
            coordinates: [-2.0319604, 53.9809063]
          },
          id: '3e16efa9-2358-4983-919d-90f876627fec'
        },
        {
          id: '5dccbbbf-37b1-449c-82e4-93586b8c1c6a',
          type: 'Feature',
          properties: {
            description: 'S1',
            coordinateGridReference: 'SD 82245 78282',
            centroidGridReference: 'SE 05918 60473'
          },
          geometry: {
            coordinates: [
              [
                [-2.2736596, 54.1999867],
                [-2.2626732, 53.8579746],
                [-1.5156029, 53.8514945],
                [-1.5925072, 54.2513671],
                [-2.2736596, 54.1999867]
              ]
            ],
            type: 'Polygon'
          }
        },
        {
          id: '54089d33-7faf-44c5-9f42-66a600717f60',
          type: 'Feature',
          properties: {
            description: 'L1',
            coordinateGridReference: 'SD 85111 78272',
            centroidGridReference: 'SE 06996 61377'
          },
          geometry: {
            coordinates: [
              [-2.2297143, 54.1999867],
              [-1.5156029, 53.8709318],
              [-1.5705346, 54.244948],
              [-2.2626732, 53.8774089]
            ],
            type: 'LineString'
          }
        }
      ],
      SBdibf: 'Yo',
      bRpVOv: [
        {
          PULqgd: 'Dad Chase',
          TKqbTU__day: 1,
          TKqbTU__month: 1,
          TKqbTU__year: 2001,
          WffjBp: [
            {
              type: 'Feature',
              properties: {
                description: 'I1P1',
                coordinateGridReference: 'NY 79583 23832',
                centroidGridReference: 'NY 79583 23832'
              },
              geometry: {
                type: 'Point',
                coordinates: [-2.3176049, 54.6092417]
              },
              id: '3daa8d71-562a-4bfc-b82e-e65c4245083b'
            },
            {
              id: 'b540809d-4340-46fc-9519-47730c3ff201',
              type: 'Feature',
              properties: {
                description: 'I1S1',
                coordinateGridReference: 'NY 48570 42452',
                centroidGridReference: 'NY 75562 23765'
              },
              geometry: {
                coordinates: [
                  [
                    [-2.8010033, 54.7743366],
                    [-2.2626732, 54.2513671],
                    [-2.0759057, 54.7996763],
                    [-2.8010033, 54.7743366]
                  ]
                ],
                type: 'Polygon'
              }
            },
            {
              id: '655057c3-f807-4f54-a3d3-ec50ccf694f0',
              type: 'Feature',
              properties: {
                description: 'I1L1',
                coordinateGridReference: 'SE 32658 87028',
                centroidGridReference: 'SE 28298 76893'
              },
              geometry: {
                coordinates: [
                  [-1.4999451, 54.2778594],
                  [-1.6357526, 54.096222]
                ],
                type: 'LineString'
              }
            }
          ],
          MwZpks__easting: 377416,
          MwZpks__northing: 516048,
          itemId: expect.any(String)
        },
        {
          PULqgd: 'Mum Chase',
          TKqbTU__day: 1,
          TKqbTU__month: 1,
          TKqbTU__year: 2001,
          WffjBp: [
            {
              type: 'Feature',
              properties: {
                description: 'I2P1',
                coordinateGridReference: 'NY 91648 24502',
                centroidGridReference: 'NY 91648 24502'
              },
              geometry: {
                type: 'Point',
                coordinates: [-2.1308373, 54.6156039]
              },
              id: 'e65f5b56-55f2-4bfe-92ae-fb49686f32a9'
            },
            {
              id: '5b8e3ab6-a232-4f96-8029-eebb8996d9b3',
              type: 'Feature',
              properties: {
                description: 'I2L1',
                coordinateGridReference: 'SE 04457 83967',
                centroidGridReference: 'SE 04799 57308'
              },
              geometry: {
                coordinates: [
                  [-1.9330834, 54.2513671],
                  [-2.469669, 53.9729062],
                  [-1.3820225, 53.8110477]
                ],
                type: 'LineString'
              }
            }
          ],
          MwZpks__easting: 384534,
          MwZpks__northing: 518854,
          itemId: expect.any(String)
        },
        {
          PULqgd: 'Child Chase',
          TKqbTU__day: 1,
          TKqbTU__month: 1,
          TKqbTU__year: 2001,
          WffjBp: [
            {
              type: 'Feature',
              properties: {
                description: 'I3P1',
                coordinateGridReference: 'SD 57949 86300',
                centroidGridReference: 'SD 57949 86300'
              },
              geometry: {
                type: 'Point',
                coordinates: [-2.6471947, 54.2706182]
              },
              id: 'd644e928-4eff-40c8-a489-4274ce74525a'
            },
            {
              id: '7eabb7c6-6358-49c3-8f25-8cc01f0e39e6',
              type: 'Feature',
              properties: {
                description: 'I3S1',
                coordinateGridReference: 'NY 50636 37489',
                centroidGridReference: 'NY 78406 24962'
              },
              geometry: {
                coordinates: [
                  [
                    [-2.7680443, 54.7299541],
                    [-2.4054955, 54.3347238],
                    [-1.8342064, 54.7933429],
                    [-2.7680443, 54.7299541]
                  ]
                ],
                type: 'Polygon'
              }
            }
          ],
          MwZpks__easting: 364853,
          MwZpks__northing: 453287,
          itemId: expect.any(String)
        }
      ]
    })
  })

  it('should omit undefined values and preserve other main and repeater values', () => {
    const message = {
      data: {
        main: {
          omitted: undefined,
          compound: {
            defined: 'value',
            omitted: undefined
          },
          list: ['item'],
          empty: null
        },
        repeaters: {
          items: [
            {
              omitted: undefined,
              date: {
                day: 1,
                omitted: undefined
              }
            },
            {}
          ]
        }
      }
    }

    // @ts-expect-error - exercises omission of undefined values in a malformed submission
    expect(mapValueToState(message, emptyDefinition)).toEqual({
      compound__defined: 'value',
      list: ['item'],
      empty: null,
      items: [
        {
          date__day: 1,
          itemId: expect.any(String)
        },
        {
          itemId: expect.any(String)
        }
      ]
    })
  })

  it('should identify strings', () => {
    expect(isString('filename')).toBe(true)
    expect(isString(null)).toBe(false)
  })
})

describe('rehydrateRepeaters', () => {
  /**
   * @param {object[]} components
   * @param {string | undefined} repeatName
   */
  const repeatPage = (components, repeatName = 'people') => ({
    title: 'Repeater page',
    path: '/people',
    components,
    next: [],
    repeat: {
      options: { name: repeatName, title: 'Person' },
      schema: { min: 1, max: 5 }
    }
  })

  /**
   * @function textComponent
   * @param {string} name
   * @returns {object}
   */
  const textComponent = (name) => ({
    id: `id-${name}`,
    type: ComponentType.TextField,
    name,
    title: name,
    options: {},
    schema: {}
  })

  /**
   * @param {object[]} pages
   * @returns {FormDefinition}
   */
  const definitionWith = (pages) =>
    /** @type {FormDefinition} */ (
      /** @type {unknown} */ ({
        name: 'Test',
        pages,
        lists: [],
        sections: [],
        conditions: []
      })
    )

  it('should add null for missing component values in each repeater item', () => {
    const definition = definitionWith([
      repeatPage([textComponent('sTUBVF'), textComponent('pUcoFr')])
    ])

    expect(
      rehydrateRepeaters(
        { people: [{ sTUBVF: 'SO 1111 1111' }, { pUcoFr: 'x' }, {}] },
        definition
      )
    ).toEqual({
      people: [
        { sTUBVF: 'SO 1111 1111', pUcoFr: null },
        { sTUBVF: null, pUcoFr: 'x' },
        { sTUBVF: null, pUcoFr: null }
      ]
    })
  })

  it('should not overwrite existing values, including falsy ones', () => {
    const definition = definitionWith([
      repeatPage([textComponent('a'), textComponent('b'), textComponent('c')])
    ])

    expect(
      rehydrateRepeaters({ people: [{ a: '', b: 0, c: false }] }, definition)
    ).toEqual({ people: [{ a: '', b: 0, c: false }] })
  })

  it('should keep an explicit null value as null', () => {
    const definition = definitionWith([repeatPage([textComponent('a')])])

    // @ts-expect-error: explicit null value is allowed
    expect(rehydrateRepeaters({ people: [{ a: null }] }, definition)).toEqual({
      people: [{ a: null }]
    })
  })

  it('should preserve extra keys such as itemId', () => {
    const definition = definitionWith([repeatPage([textComponent('a')])])

    expect(
      rehydrateRepeaters({ people: [{ itemId: 'abc' }] }, definition)
    ).toEqual({ people: [{ itemId: 'abc', a: null }] })
  })

  it('should expand composite components into their sub field names', () => {
    const definition = definitionWith([
      repeatPage([
        {
          id: 'date-id',
          type: ComponentType.DatePartsField,
          name: 'dob',
          title: 'Date of birth',
          options: {},
          schema: {}
        }
      ])
    ])

    const [item] = rehydrateRepeaters({ people: [{}] }, definition).people

    expect(Object.keys(item).sort()).toEqual([
      'dob__day',
      'dob__month',
      'dob__year'
    ])
    expect(Object.values(item).every((v) => v === null)).toBe(true)
  })

  it('should rehydrate multiple repeater pages independently', () => {
    const definition = definitionWith([
      repeatPage([textComponent('a')], 'first'),
      repeatPage([textComponent('b')], 'second')
    ])

    expect(
      rehydrateRepeaters({ first: [{}], second: [{ b: 'x' }, {}] }, definition)
    ).toEqual({
      first: [{ a: null }],
      second: [{ b: 'x' }, { b: null }]
    })
  })

  it('should ignore non-repeater pages and leave unrelated state untouched', () => {
    const definition = definitionWith([
      {
        title: 'Plain',
        path: '/plain',
        components: [textComponent('plain')],
        next: []
      },
      repeatPage([textComponent('a')])
    ])
    const other = [{ keep: 'me' }]

    expect(rehydrateRepeaters({ people: [{}], other }, definition)).toEqual({
      people: [{ a: null }],
      other: [{ keep: 'me' }]
    })
  })

  it('should skip repeater pages with no matching or non-array data', () => {
    const definition = definitionWith([
      repeatPage([textComponent('a')], 'missing'),
      repeatPage([textComponent('b')], 'notArray')
    ])
    const repeaters = { notArray: 'value' }

    // @ts-expect-error - exercises malformed repeater data
    expect(rehydrateRepeaters(repeaters, definition)).toEqual({
      notArray: 'value'
    })
  })

  it('should return empty arrays unchanged', () => {
    const definition = definitionWith([repeatPage([textComponent('a')])])

    expect(rehydrateRepeaters({ people: [] }, definition)).toEqual({
      people: []
    })
  })

  it('should not mutate the input repeaters', () => {
    const definition = definitionWith([repeatPage([textComponent('a')])])
    const repeaters = { people: [{ x: 1 }] }

    const result = rehydrateRepeaters(repeaters, definition)

    expect(result).not.toBe(repeaters)
    expect(repeaters).toEqual({ people: [{ x: 1 }] })
  })

  it('should return the repeaters as-is when there are no repeater pages', () => {
    expect(
      rehydrateRepeaters({ people: [{ a: 1 }] }, definitionWith([]))
    ).toEqual({ people: [{ a: 1 }] })
  })

  it('should be applied by mapValueToState for missing repeater fields', () => {
    const definition = definitionWith([
      repeatPage([textComponent('sTUBVF'), textComponent('pUcoFr')])
    ])
    const message = {
      data: { main: {}, repeaters: { people: [{ sTUBVF: 'SO 1111 1111' }] } }
    }

    // @ts-expect-error - partial submission document
    expect(mapValueToState(message, definition)).toEqual({
      people: [
        { sTUBVF: 'SO 1111 1111', pUcoFr: null, itemId: expect.any(String) }
      ]
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
