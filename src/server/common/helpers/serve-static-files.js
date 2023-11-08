import { config } from '~/src/config'

const serveStaticFiles = {
  plugin: {
    name: 'Serve static files',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/public/{param*}',
        handler: {
          directory: {
            path: '.',
            redirectToSlash: true
          }
        },
        config: {
          cache: {
            expiresIn: config.get('staticCacheTimeout'),
            privacy: 'private'
          }
        }
      })
    }
  }
}

export { serveStaticFiles }
