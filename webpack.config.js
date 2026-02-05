import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { WebpackAssetsManifest } from 'webpack-assets-manifest'

const { NODE_ENV = 'development' } = process.env

const require = createRequire(import.meta.url)

const govukFrontendPath = dirname(
  require.resolve('govuk-frontend/package.json')
)

const pluginPath = dirname(
  require.resolve('@defra/forms-engine-plugin/package.json')
)

/**
 * @type {Configuration}
 */
export default {
  context: join(import.meta.dirname, 'src/client'),
  entry: {
    application: {
      import: ['./javascripts/application.js', './stylesheets/application.scss']
    },
    maps: {
      import: ['./javascripts/maps.js']
    }
  },
  experiments: { outputModule: true },
  mode: NODE_ENV === 'production' ? 'production' : 'development',
  devtool: NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
  watchOptions: { aggregateTimeout: 200, poll: 1000 },
  output: {
    filename:
      NODE_ENV === 'production'
        ? 'javascripts/[name].[contenthash:7].min.js'
        : 'javascripts/[name].js',

    chunkFilename:
      NODE_ENV === 'production'
        ? 'javascripts/[name].[chunkhash:7].min.js'
        : 'javascripts/[name].js',

    path: join(import.meta.dirname, '.public'),
    libraryTarget: 'module',
    module: true
  },
  resolve: {
    alias: { '/assets': join(govukFrontendPath, 'dist/govuk/assets') }
  },
  module: {
    rules: [
      { test: /\.(js|mjs|scss)$/, loader: 'source-map-loader', enforce: 'pre' },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          browserslistEnv: 'javascripts',
          cacheDirectory: true,
          extends: join(import.meta.dirname, 'babel.config.cjs'),
          presets: [
            [
              '@babel/preset-env',
              {
                // Apply bug fixes to avoid transforms
                bugfixes: true,

                // Apply smaller "loose" transforms for browsers
                loose: true,

                // Skip CommonJS modules transform
                modules: false
              }
            ]
          ]
        },

        // Flag loaded modules as side effect free
        sideEffects: false
      },
      {
        test: /\.scss$/,
        type: 'asset/resource',
        generator: {
          binary: false,
          filename:
            NODE_ENV === 'production'
              ? 'stylesheets/[name].[contenthash:7].min.css'
              : 'stylesheets/[name].css'
        },
        use: [
          'postcss-loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                quietDeps: true,
                sourceMapIncludeSources: true,
                style: 'expanded'
              },
              warnRuleAsWarning: true
            }
          }
        ]
      },
      {
        test: /\.(png|svg|jpe?g|gif)$/,
        type: 'asset/resource',
        generator: { filename: 'assets/images/[name][ext]' }
      },
      {
        test: /\.(ico)$/,
        type: 'asset/resource',
        generator: { filename: 'assets/images/[name][ext]' }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: { filename: 'assets/fonts/[name][ext]' }
      }
    ]
  },
  optimization: {
    minimize: NODE_ENV === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Use webpack default compress options
          // https://webpack.js.org/configuration/optimization/#optimizationminimizer
          compress: { passes: 2 },

          // Allow Terser to remove @preserve comments
          format: { comments: false },

          // Include sources content from dependency source maps
          sourceMap: { includeSources: true },

          // Compatibility workarounds
          safari10: true
        }
      })
    ],
    splitChunks: {
      cacheGroups: {
        defaultVendors: {
          name(module) {
            const packages = Array.from(
              module.identifier().matchAll(/node_modules\/([^\\/]+)/g)
            ).map((match) => {
              return { modulePath: match[0], pkgName: match[1] }
            })

            const pkg = packages.pop()

            if (!pkg) {
              throw Error('Unknown package when splitting chunks')
            }

            // Move into /javascripts/vendor
            return join('vendor', pkg.pkgName || pkg.modulePath)
          }
        }
      }
    },

    // Skip bundling unused modules
    providedExports: true,
    sideEffects: true,
    usedExports: true
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WebpackAssetsManifest(),
    new CopyPlugin({
      patterns: [
        { from: join(govukFrontendPath, 'dist/govuk/assets'), to: 'assets' },
        {
          from: join(pluginPath, '../interactive-map/dist'),
          to: 'assets/interactive-map'
        },
        {
          from: join(pluginPath, '../interactive-map/providers/maplibre'),
          to: 'assets/interactive-map/providers/maplibre'
        },
        {
          from: join(
            pluginPath,
            '../interactive-map/providers/beta/open-names'
          ),
          to: 'assets/interactive-map/providers/open-names'
        },
        {
          from: join(
            pluginPath,
            '../interactive-map/plugins/beta/map-styles/dist'
          ),
          to: 'assets/interactive-map/plugins/map-styles/dist'
        },
        {
          from: join(
            pluginPath,
            '../interactive-map/plugins/beta/scale-bar/dist'
          ),
          to: 'assets/interactive-map/plugins/scale-bar/dist'
        },
        {
          from: join(pluginPath, '../interactive-map/plugins/interact/dist'),
          to: 'assets/interactive-map/plugins/interact/dist'
        },
        {
          from: join(pluginPath, '../interactive-map/plugins/search/dist'),
          to: 'assets/interactive-map/plugins/search/dist'
        },
        {
          from: join(pluginPath, '../interactive-map/assets'),
          to: 'assets/interactive-map/assets'
        }
      ]
    })
  ],
  stats: {
    errorDetails: true,
    loggingDebug: ['sass-loader'],
    preset: 'minimal'
  },
  target: 'browserslist:javascripts'
}

/**
 * @import { Configuration } from 'webpack'
 */
