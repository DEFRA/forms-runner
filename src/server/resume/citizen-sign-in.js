import { config } from '~/src/config/index.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { getSavedFormState } from '~/src/server/services/submissionService.js'
import { signInUrl } from '~/src/server/utils/utils.js'

/**
 * Resumes a record that belongs to a citizen account. The submission api
 * checks the token against the record, so this strategy asks for the state and
 * treats a refusal as an error rather than testing ownership itself.
 * @type {ResumeStrategy}
 */
export const signInStrategy = {
  async start(request, context) {
    // The sign-in route and the citizen-session auth strategy only exist
    // when this flag is on, so send the citizen to the error page here
    // rather than to a sign-in page that would 404.
    if (!config.get('useSignInFeature')) {
      return { kind: 'error' }
    }

    const { auth } = request

    if (!auth.isAuthenticated) {
      return { kind: 'redirect', location: signInUrl(request.path) }
    }

    try {
      const saved = await getSavedFormState(
        auth.credentials.accessToken,
        context.magicLinkId
      )

      return {
        kind: 'resume',
        state: saved.state,
        magicLinkGroupId: saved.magicLinkGroupId
      }
    } catch (err) {
      logger.info(
        { err },
        `No saved form for magic link ${context.magicLinkId}`
      )

      return { kind: 'error' }
    }
  }
}

/**
 * @import { ResumeStrategy } from '~/src/server/resume/types.js'
 */
