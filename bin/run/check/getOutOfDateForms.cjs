const path = require('node:path')
const fs = require('node:fs/promises')

const helper = require('./getJsonFiles.cjs')
const { FORM_PATH, CURRENT_SCHEMA_VERSION } = require('./util.cjs')

async function getOutOfDateForms() {
  const files = await helper.getJsonFiles()
  const needsMigration = []

  for (const file of files) {
    const form = await fs.readFile(path.join(FORM_PATH, file))
    const version = JSON.parse(form).version || 0
    version < CURRENT_SCHEMA_VERSION && needsMigration.push(file)
  }

  return needsMigration
}

module.exports = {
  getOutOfDateForms
}
