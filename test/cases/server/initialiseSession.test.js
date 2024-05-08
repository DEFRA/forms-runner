import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '~/src/server/config.js'
import createServer from '~/src/server/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

/** @type {import('@hapi/hapi').Server} */
let server

const options = {
  callbackUrl: 'https://webho.ok',
  message: 'Please fix this thing..',
  customText: {
    paymentSkipped: false,
    nextSteps: false
  },
  components: [
    {
      name: 'WLskhZ',
      options: {},
      type: 'Html',
      content: 'Thanks!',
      schema: {}
    }
  ]
}

const baseRequest = {
  options,
  name: 'undefined lawyers-mod',
  questions: [
    {
      question: 'Which list of lawyers do you want to be added to?',
      fields: [
        {
          key: 'country',
          title: 'Country list',
          type: 'list',
          answer: 'Italy'
        }
      ]
    },
    {
      fields: [
        {
          key: 'size',
          title: 'Company size',
          type: 'list',
          answer: 'Large firm (350+ legal professionals)'
        }
      ]
    },
    {
      question:
        'Which legal regulator or local bar associations are you registered with?',
      fields: [
        {
          key: 'regulators',
          title: 'Regulator(s)',
          type: 'text',
          answer: 'test'
        }
      ]
    },
    {
      question: 'In what areas of law are you qualified to practise? ',
      fields: [
        {
          key: 'areasOfLaw',
          title: 'Areas of law practised',
          type: 'list',
          answer: ['Bankruptcy', 'Corporate', 'Criminal']
        }
      ]
    },
    {
      question: 'Can you provide legal aid to British nationals?',
      fields: [
        {
          key: 'legalAid',
          title: 'Can you provide legal aid to British nationals?',
          type: 'list',
          answer: true
        }
      ]
    }
  ],
  metadata: { woo: 'ah' }
}

describe('InitialiseSession', () => {
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'test.json',
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('POST /session/{id}', () => {
    test('responds with token if file exists', async () => {
      const serverRequestOptions = {
        method: 'POST',
        url: `/session/test`,
        payload: baseRequest
      }

      const { payload } = await server.inject(serverRequestOptions)
      expect(payload).toBeTruthy()
    })

    test.skip('responds with token if form doesnt exist', async () => {
      const serverRequestOptions = {
        method: 'POST',
        url: `/session/four-o-four`,
        payload: baseRequest
      }

      const { statusCode } = await server.inject(serverRequestOptions)
      expect(statusCode).toBe(404)
    })

    test('responds with a 403 if the callbackUrl has not been safelisted', async () => {
      const serverRequestOptions = {
        method: 'POST',
        url: `/session/test`,
        payload: {
          ...baseRequest,
          options: { ...options, callbackUrl: 'gov.uk' }
        }
      }
      const { statusCode } = await server.inject(serverRequestOptions)
      expect(statusCode).toBe(403)
    })
  })

  describe('GET /session/{token}', () => {
    test('redirects the user to the correct form', async () => {
      const serverRequestOptions = {
        method: 'POST',
        url: `/session/test`,
        payload: { ...baseRequest, options: { ...options, redirectPath: '' } }
      }
      let postResponse
      let getResponse
      let token

      postResponse = await server.inject(serverRequestOptions)
      token = JSON.parse(postResponse.payload).token

      getResponse = await server.inject({
        url: `/session/${token}`
      })

      expect(getResponse.statusCode).toBe(302)
      expect(getResponse.headers.location).toBe('/test')

      serverRequestOptions.payload.options.redirectPath = 'summary'
      postResponse = await server.inject(serverRequestOptions)
      token = JSON.parse(postResponse.payload).token

      getResponse = await server.inject({
        url: `/session/${token}`
      })
      expect(getResponse.statusCode).toBe(302)
      expect(getResponse.headers.location).toBe('/test/summary')
    })
  })

  describe('token verification', function () {
    /** @type {import('@hapi/hapi').ServerInjectOptions} */
    let serverRequestOptions

    beforeEach(() => {
      serverRequestOptions = {
        method: 'POST',
        url: `/session/test`,
        payload: {
          ...baseRequest,
          options: { ...options, callbackUrl: 'https://webho.ok' }
        }
      }
    })

    test('When token is valid', async () => {
      const response = await server.inject(serverRequestOptions)
      const payload = JSON.parse(response.payload)
      const token = payload.token
      const getResponse = await server.inject({
        method: 'GET',
        url: `/session/${token}`
      })

      expect(getResponse.statusCode).toBe(302)
    })

    test('When token is invalid', async () => {
      const response = await server.inject(serverRequestOptions)
      const payload = JSON.parse(response.payload)
      const token = payload.token

      jest.replaceProperty(config, 'initialisedSessionKey', 'incorrect key')

      const getResponse = await server.inject({
        method: 'GET',
        url: `/session/${token}`
      })

      expect(getResponse.statusCode).toBe(400)
    })
  })
})
