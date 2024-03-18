import fs from 'node:fs/promises'

import jsonHelper from '../../../bin/run/check/getJsonFiles.js'
import outOfDateHelper from '../../../bin/run/check/getOutOfDateForms.js'

describe('check out of date forms', () => {
  test('getJsonFiles returns files with .json extension only', async () => {
    await expect(jsonHelper.getJsonFiles()).resolves.toEqual(
      expect.arrayContaining(['report-a-terrorist.json', 'test.json'])
    )

    await expect(jsonHelper.getJsonFiles()).resolves.not.toContain('README.md')
  })

  test('getOutOfDateForms detects out of date forms', async () => {
    jest
      .spyOn(jsonHelper, 'getJsonFiles')
      .mockResolvedValueOnce([
        'no-version.json',
        'v0.json',
        'v1.json',
        'v2.json'
      ])

    jest
      .spyOn(fs, 'readFile')
      .mockResolvedValueOnce('{}')
      .mockResolvedValueOnce(`{ "version": 0 }`)
      .mockResolvedValueOnce(`{ "version": 1 }`)
      .mockResolvedValueOnce(`{ "version": 2 }`)

    await expect(outOfDateHelper.getOutOfDateForms()).resolves.toEqual([
      'no-version.json',
      'v0.json',
      'v1.json'
    ])
  })
})
