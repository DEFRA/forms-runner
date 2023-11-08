import { homeController } from '~/src/server/home/controller'

const home = {
  plugin: {
    name: 'home',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...homeController
        }
      ])
    }
  }
}

export { home }
