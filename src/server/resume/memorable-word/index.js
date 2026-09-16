/** @type {ResumeStrategy} */
export const memorableWordStrategy = {
  start() {
    return Promise.resolve({ kind: 'error' })
  }
}

/**
 * @import { ResumeStrategy } from '~/src/server/resume/types.js'
 */
