import { createServer } from '~/src/server/index.js'

createServer({})
  .then((server) => server.start())
  .then(() => process.send?.('online'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
