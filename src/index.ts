import createServer from '~/src/server/index.js'

createServer({
  formFileName: 'test.json',
  formFilePath: 'src/server/forms'
})
  .then((server) => server.start())
  .then(() => process.send?.('online'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
