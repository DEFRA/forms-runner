const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WebpackAssetsManifest = require('webpack-assets-manifest')

const webpackConfig = {
  isDevelopment: process.env.NODE_ENV !== 'production',
  stylesheets: {
    components: path.resolve(__dirname, 'src', 'server', 'common', 'components')
  }
}

module.exports = {
  entry: {
    application: './src/client/assets/javascripts/application.js'
  },
  mode: webpackConfig.isDevelopment ? 'development' : 'production',
  ...(webpackConfig.isDevelopment && { devtool: 'source-map' }),
  watchOptions: {
    aggregateTimeout: 200,
    poll: 1000
  },
  output: {
    filename: 'js/[name].[fullhash].js',
    path: path.resolve(__dirname, '.public'),
    library: '[name]'
  },
  module: {
    rules: [
      ...(webpackConfig.isDevelopment
        ? [
            {
              test: /\.js$/,
              enforce: 'pre',
              use: ['source-map-loader']
            }
          ]
        : []),
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: 'defaults' }]]
          }
        }
      },
      {
        test: /\.(?:s[ac]|c)ss$/i,
        use: [
          'style-loader',
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../',
              esModule: false
            }
          },
          'css-loader',
          ...(webpackConfig.isDevelopment ? ['resolve-url-loader'] : []),
          {
            loader: 'sass-loader',
            options: {
              ...(webpackConfig.isDevelopment && { sourceMap: true }),
              sassOptions: {
                outputStyle: 'compressed',
                quietDeps: true,
                includePaths: [webpackConfig.stylesheets.components]
              }
            }
          }
        ]
      },
      {
        test: /\.(png|svg|jpe?g|gif|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash][ext]'
        }
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WebpackAssetsManifest({
      output: 'manifest.json'
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[fullhash].css'
    })
  ]
}
