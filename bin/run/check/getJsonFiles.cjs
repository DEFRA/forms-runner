const fs = require('node:fs/promises')
const path = require('node:path')

const { FORM_PATH } = require('./util.cjs')

async function getJsonFiles() {
  return (await fs.readdir(FORM_PATH)).filter(
    (file) => path.extname(file) === '.json'
  )
}

module.exports = {
  getJsonFiles
}
