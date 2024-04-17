import { buildConfig } from './utils/configSchema.js'
import nodeConfig from 'config'

const config = buildConfig(nodeConfig)

export default config
