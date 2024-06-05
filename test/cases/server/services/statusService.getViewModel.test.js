import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'

import createServer from '~/src/server/index.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { StatusService } from '~/src/server/services/index.js'
import form from '~/test/cases/server/status.test.json' with { type: 'json' }

const testDir = dirname(fileURLToPath(import.meta.url))

describe('Status Service', () => {
  const cacheService = { getState: () => ({}), mergeState: () => {} }
  const webhookService = { postRequest: () => ({}) }
  const notifyService = { sendNotification: () => ({}) }
  const payService = {
    payStatus: () => {}
  }

  /** @type {import('@hapi/hapi').Server} */
  const server = {
    services: () => ({
      cacheService,
      webhookService,
      payService,
      notifyService
    }),
    logger: {
      info: () => {},
      trace: () => {}
    }
  }

  describe('returns the correct components based on a condition', () => {
    const stateForLisbon = {
      whichConsulate: 'lisbon'
    }

    const formModel = new FormModel(form, {})
    const statusService = new StatusService(server)

    const lisbonViewModel = statusService.getViewModel(
      stateForLisbon,
      formModel
    )

    expect(lisbonViewModel.components).toHaveLength(1)
    expect(lisbonViewModel.components[0].model).toEqual({
      attributes: {},
      content: '<p class="govuk-body">lisbon</p>',
      condition: 'isLisbon'
    })
    const stateForPortimao = {
      whichConsulate: 'portimao'
    }

    const portimaoViewModel = statusService.getViewModel(
      stateForPortimao,
      formModel
    )
    expect(portimaoViewModel.components[0].model).toEqual({
      attributes: {},
      content: '<p class="govuk-body">portimao</p>',
      condition: 'isPortimao'
    })
  })

  describe('getViewModel returns the correct components based on a condition', () => {
    const stateForLisbon = {
      whichConsulate: 'lisbon'
    }

    const formModel = new FormModel(form, {})
    const statusService = new StatusService(server)

    const lisbonViewModel = statusService.getViewModel(
      stateForLisbon,
      formModel
    )

    expect(lisbonViewModel.components).toHaveLength(1)
    expect(lisbonViewModel.components[0].model).toEqual({
      attributes: {},
      content: '<p class="govuk-body">lisbon</p>',
      condition: 'isLisbon'
    })
    const stateForPortimao = {
      whichConsulate: 'portimao'
    }

    const portimaoViewModel = statusService.getViewModel(
      stateForPortimao,
      formModel
    )
    expect(portimaoViewModel.components[0].model).toEqual({
      attributes: {},
      content: '<p class="govuk-body">portimao</p>',
      condition: 'isPortimao'
    })
  })

  describe('getViewModel renders custom text correctly', () => {
    /** @type {import('@hapi/hapi').Server} */
    let server

    /** @type {StatusService} */
    let statusService

    /** @type {string} */
    let response

    /** @type {import('cheerio').CheerioAPI} */
    let $

    beforeAll(async () => {
      server = await createServer({
        formFileName: 'status.test.json',
        formFilePath: resolve(testDir, '..'),
        enforceCsrf: false
      })
      statusService = server.services().statusService
    })

    afterAll(async () => {
      await server.stop()
    })

    test('with confirmationPage undefined', async () => {
      const formDef = { ...form, specialPages: {} }
      const formModel = new FormModel(formDef, {})
      const vmWithoutConfirmationPage = statusService.getViewModel(
        {},
        formModel
      )
      response = await server.render('confirmation', vmWithoutConfirmationPage)

      $ = load(response)
      expect($('body').text()).toContain('Application complete')
      expect($('body').text()).toContain(
        'You will receive an email with details with the next steps'
      )
    })
    test('with confirmationPage as empty object', async () => {
      const formDef = { ...form, specialPages: { confirmationPage: {} } }
      const formModel = new FormModel(formDef, {})

      const vmWithoutCustomText = statusService.getViewModel({}, formModel)
      response = await server.render('confirmation', vmWithoutCustomText)

      $ = load(response)
      expect($('body').text()).toContain('Application complete')
      expect($('body').text()).toContain(
        'You will receive an email with details with the next steps'
      )
    })

    test('with customText toggled', async () => {
      const formModel = new FormModel(form, {})

      formModel.def.specialPages.confirmationPage.customText = {
        nextSteps: false,
        paymentSkipped: false
      }

      const vmWithToggledText = statusService.getViewModel({}, formModel)
      response = await server.render('confirmation', {
        ...vmWithToggledText,
        paymentSkipped: true
      })

      $ = load(response)
      expect($('body').text()).not.toContain(
        'Someone will be in touch to make a payment.'
      )
      expect($('body').text()).not.toContain(
        'You will receive an email with details with the next steps'
      )
    })
    test('with customText defined', async () => {
      const formModel = new FormModel(form, {})

      formModel.def.specialPages.confirmationPage.customText = {
        title: 'Soup',
        nextSteps: 'Tragedy',
        paymentSkipped: 'No eggs for you'
      }

      const vmWithCustomisations = statusService.getViewModel({}, formModel)
      response = await server.render('confirmation', {
        ...vmWithCustomisations,
        paymentSkipped: true
      })

      $ = load(response)
      expect($('h1').text()).toContain('Soup')
      expect($('body').text()).toContain('No eggs for you')
      expect($('body').text()).not.toContain(
        'You will receive an email with details with the next steps'
      )

      response = await server.render('confirmation', {
        ...vmWithCustomisations,
        paymentSkipped: false
      })

      $ = load(response)
      expect($('h1').text()).toContain('Soup')
      expect($('body').text()).not.toContain('No eggs for you')
      expect($('body').text()).toContain('Tragedy')
    })
    test('with callback defined', async () => {
      const formModel = new FormModel(form, {})

      formModel.def.specialPages.confirmationPage.customText = {
        title: 'Soup',
        nextSteps: 'Tragedy',
        paymentSkipped: 'No eggs for you'
      }

      /** @type {FormSubmissionState} */
      const userState = {
        callback: {
          customText: {
            title: 'Application resubmitted',
            paymentSkipped: false,
            nextSteps: false
          },
          components: [
            {
              options: {},
              type: 'Html',
              content: 'Thanks!',
              schema: {}
            }
          ]
        }
      }

      const vmWithCallback = statusService.getViewModel(userState, formModel)
      response = await server.render('confirmation', {
        ...vmWithCallback,
        paymentSkipped: true
      })

      $ = load(response)
      expect($('h1').text()).toContain('Application resubmitted')
      expect($('body').text()).toContain('Thanks!')
      expect($('body').text()).not.toContain('No eggs for you')
      expect($('body').text()).not.toContain(
        'You will receive an email with details with the next steps'
      )
    })
  })
})

/**
 * @typedef {import('~/src/server/plugins/engine/types.js').FormSubmissionState} FormSubmissionState
 */
