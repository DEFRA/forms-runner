import { buildConfig } from './utils/configSchema'
import nodeConfig from 'config'

const config = buildConfig(nodeConfig)

export default config
