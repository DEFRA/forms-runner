import { type ServerRegisterPluginObject } from '@hapi/hapi'
import pulse from 'hapi-pulse'

export default {
  plugin: pulse,
  options: {
    timeout: 800
  }
} satisfies ServerRegisterPluginObject<{
  timeout: number
}>
