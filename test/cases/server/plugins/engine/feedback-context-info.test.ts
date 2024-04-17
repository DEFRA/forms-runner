import {
  FeedbackContextInfo,
  decodeFeedbackContextInfo
} from '../../../../../src/server/plugins/engine/feedback/index.js'

describe('Feedback context info', () => {
  test('Should be able to be serialised and deserialised', () => {
    const original = new FeedbackContextInfo('My form', 'My page', '/badger')

    expect(decodeFeedbackContextInfo(original.toString())).toEqual(original)
  })

  test('toString should be url friendly', () => {
    const original = new FeedbackContextInfo('My form', 'My page', '/badger')

    expect(/^[A-Za-z0-9+/=]*$/.test(original.toString())).toBe(true)
  })
})
