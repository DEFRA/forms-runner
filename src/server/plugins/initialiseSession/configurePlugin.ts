import { initialiseSession } from '../../plugins/initialiseSession/initialiseSession.js'

export function configureInitialiseSessionPlugin(options: {
  safelist: string[]
}) {
  return {
    plugin: initialiseSession,
    options
  }
}
