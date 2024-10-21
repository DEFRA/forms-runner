import { type ServerRegisterPluginObject } from '@hapi/hapi'
import Blankie from 'blankie'

export default {
  plugin: Blankie,
  options: {
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    connectSrc: ['self'],
    scriptSrc: ['self', 'unsafe-inline'],
    styleSrc: ['self', 'unsafe-inline'],
    imgSrc: ['self'],
    frameSrc: ['self', 'data:'],
    generateNonces: false
  }
} satisfies ServerRegisterPluginObject<Record<string, boolean | string[]>>
