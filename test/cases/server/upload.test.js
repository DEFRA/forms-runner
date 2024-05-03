import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'
import FormData from 'form-data'

import config from '~/src/server/config.js'
import createServer from '~/src/server/index.js'
import { UploadService } from '~/src/server/services/upload/index.js'

const testDir = dirname(fileURLToPath(import.meta.url))

describe('uploads', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    config.documentUploadApiUrl = 'http://localhost:9000'
    server = await createServer({
      formFileName: 'upload.json',
      formFilePath: testDir
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('request with file upload field populated is successful and redirects to next page', async () => {
    const form = new FormData()
    form.append('fullName', 1)
    form.append('file1', Buffer.from('an image..'))
    // form.append('file2', Buffer.from([]))
    const options = {
      method: 'POST',
      url: '/upload/upload-file',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(302)
    expect(response.headers).toMatchObject({
      location: '/upload/summary'
    })
  })

  test('request with file upload field containing virus returns with error message', async () => {
    jest
      .spyOn(UploadService.prototype, 'fileStreamsFromPayload')
      .mockReturnValue([
        [
          'file1',
          {
            hapi: { filename: 'file.jpg' },
            _data: fs.readFileSync(join(testDir, 'dummy.pdf'))
          }
        ]
      ])

    jest.spyOn(UploadService.prototype, 'uploadDocuments').mockReturnValue({
      error: 'The selected file for "%s" contained a virus'
    })

    const form = new FormData()
    form.append('fullName', 1)
    form.append('file1', fs.readFileSync(join(testDir, 'dummy.pdf')))
    const options = {
      method: 'POST',
      url: '/upload/upload-file',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    }
    const response = await server.inject(options)

    const $ = load(response.payload)
    expect($("[href='#file1']").text().trim()).toBe(
      'The selected file for "Passport photo" contained a virus'
    )
  })

  test('request with files larger than 2MB return an error', async () => {
    fs.writeFileSync('tmp.pdf', Buffer.alloc(6 * 1024 * 1024, 'a'))

    const data = fs.readFileSync('tmp.pdf')

    const form = new FormData()
    form.append('fullName', 1)
    form.append('file1', data)

    const options = {
      method: 'POST',
      url: '/upload/upload-file',
      headers: form.getHeaders(),
      payload: undefined
    }
    const response = await server.inject(options)

    const $ = load(response.payload)

    expect($("[href='#file1']").text().trim()).toContain(
      'The selected file must be smaller than'
    )
  })

  test('request with file upload field containing invalid file type returns with error message', async () => {
    jest
      .spyOn(UploadService.prototype, 'fileStreamsFromPayload')
      .mockReturnValue([
        [
          'file1',
          {
            hapi: { filename: 'file.test' },
            _data: fs.readFileSync(join(testDir, 'dummy.pdf'))
          }
        ]
      ])

    const form = new FormData()
    form.append('fullName', 1)
    form.append('file1', fs.readFileSync(join(testDir, 'dummy.pdf')))
    const options = {
      method: 'POST',
      url: '/upload/upload-file',
      headers: form.getHeaders(),
      payload: form.getBuffer()
    }
    const response = await server.inject(options)

    const $ = load(response.payload)
    expect($("[href='#file1']").text().trim()).toContain(
      'The selected file for "Passport photo" must be a jpg, jpeg, png or pdf'
    )
  })
})
