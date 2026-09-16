import { resumeFormPath } from '~/src/server/utils/utils.js'

describe('resumeFormPath', () => {
  it('builds the path that resumes a saved form', () => {
    expect(
      resumeFormPath(
        'eab6ac6c-79b6-439f-bd94-d93eb121b3f1',
        'fd4e6453-fb32-43e4-b4cf-12b381a713de'
      )
    ).toBe(
      '/resume-form/eab6ac6c-79b6-439f-bd94-d93eb121b3f1/fd4e6453-fb32-43e4-b4cf-12b381a713de'
    )
  })
})
