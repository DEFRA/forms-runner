const jsonServer = require('json-server')

const api = require('./api')
const port = 3004

const index = jsonServer.create()
const router = jsonServer.router(api)
const middlewares = jsonServer.defaults()

index.use(middlewares)
index.use('/mock-api', router)

index.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock JSON server started on http://localhost:${port}/mock-api`)
})
