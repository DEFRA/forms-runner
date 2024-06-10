import { type ServerRegisterPluginObject } from '@hapi/hapi'
import Blankie from 'blankie'

export function configureBlankiePlugin(): ServerRegisterPluginObject<Blankie> {
  return {
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
  }
}
