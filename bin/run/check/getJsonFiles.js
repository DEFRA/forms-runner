const path = require('node:path')
const fs = require('node:fs/promises')

const { FORM_PATH } = require('./util')

async function getJsonFiles() {
  return (await fs.readdir(FORM_PATH)).filter(
    (file) => path.extname(file) === '.json'
  )
}

module.exports = {
  getJsonFiles
}
