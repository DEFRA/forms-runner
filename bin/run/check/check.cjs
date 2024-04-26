#!/usr/bin/env node

const helper = require('./getOutOfDateForms.cjs')
const { ux } = require('@oclif/core')

async function check() {
  ux.action.start('Checking versions of forms in src/server/forms')
  const files = await helper.getOutOfDateForms()
  ux.action.stop()

  if (files.length) {
    ux.warn(
      `Your form(s) ${files.join(
        ', '
      )} is/are out of date. Use the designer to upload your files, which runs the migration scripts. Download those JSONs to replace the outdated forms. Migration scripts will not cover conditional reveal fields. You will need to fix those manually.`
    )
    process.exit(1)
  } else {
    ux.info('Your forms are up to date')
  }
}

check()
