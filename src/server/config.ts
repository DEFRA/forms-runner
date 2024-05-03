import nodeConfig from 'config'

import { buildConfig } from '~/src/server/utils/configSchema.js'

const config = buildConfig(nodeConfig)

export default config
