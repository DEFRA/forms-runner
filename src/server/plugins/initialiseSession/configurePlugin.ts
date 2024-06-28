import { initialiseSession } from '~/src/server/plugins/initialiseSession/index.js'

export function configureInitialiseSessionPlugin(options: {
  safelist: string[]
}) {
  return {
    plugin: initialiseSession,
    options
  }
}
