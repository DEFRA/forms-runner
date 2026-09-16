/** @type {ResumeStrategy} */
export const signInStrategy = {
  start() {
    return Promise.resolve({ kind: 'error' })
  }
}

/**
 * @import { ResumeStrategy } from '~/src/server/resume/types.js'
 */
