import { FeesModel } from './../FeesModel.js'
import json from './FeesModel.test.json'

import { FormModel } from '../../../../../plugins/engine/models/index.js'

describe('FeesModel', () => {
  test('returns correct FeesModel', () => {
    const c = {
      caz: '2'
    }

    const form = new FormModel(json, {})
    const model = FeesModel(form, c)
    expect(model).toEqual({
      details: [
        { description: 'Bristol tax', amount: 5000, condition: 'dFQTyf' },
        { description: 'car tax', amount: 5000 }
      ],
      total: 10000,
      prefixes: [],
      referenceFormat: 'FCDO-{{DATE}}'
    })
  })
  test('returns correct payment reference format when a peyment reference is supplied in the feeOptions', () => {
    const c = {
      caz: '2'
    }
    const newJson = {
      ...json,
      feeOptions: {
        paymentReferenceFormat: 'FCDO2-{{DATE}}'
      }
    }
    const form = new FormModel(newJson, {})
    const model = FeesModel(form, c)
    expect(model).toEqual({
      details: [
        { description: 'Bristol tax', amount: 5000, condition: 'dFQTyf' },
        { description: 'car tax', amount: 5000 }
      ],
      total: 10000,
      prefixes: [],
      referenceFormat: 'FCDO2-{{DATE}}'
    })
  })
})
