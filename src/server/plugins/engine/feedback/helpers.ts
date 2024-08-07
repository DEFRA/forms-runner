import atob from 'atob'

import { FeedbackContextInfo } from '~/src/server/plugins/engine/feedback/FeedbackContextInfo.js'

export function decodeFeedbackContextInfo(
  encoded: string | Buffer | undefined | null
): FeedbackContextInfo | undefined {
  if (encoded) {
    const decoded = JSON.parse(atob(encoded))

    return new FeedbackContextInfo(
      decoded.formTitle,
      decoded.pageTitle,
      decoded.url
    )
  }
}
