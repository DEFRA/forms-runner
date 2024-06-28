import autoprefixer from 'autoprefixer'

/**
 * @type {Config}
 */
export default {
  plugins: [
    autoprefixer({
      env: 'stylesheets'
    })
  ]
}

/**
 * @typedef {import('postcss-load-config').Config} Config
 */
