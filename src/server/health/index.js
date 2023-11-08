import { healthController } from '~/src/server/health/controller'

const health = {
  plugin: {
    name: 'health',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/health',
        ...healthController
      })
    }
  }
}

export { health }
