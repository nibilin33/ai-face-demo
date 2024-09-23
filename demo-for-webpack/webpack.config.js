const path = require("path");
const fs = require("fs");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
function getPages() {
  const pages = path.resolve(__dirname, "src");
  const dirs = fs.readdirSync(pages);
  let pageConfig = {};
  let plugins = [];
  dirs.forEach((name) => {
    const stat = fs.lstatSync(path.join(pages, name));
    if (stat.isDirectory()) {
      pageConfig[name] = path.join(pages, `${name}/app.js`);
      plugins.push(
        new HtmlWebpackPlugin({
          template: path.join(pages, `${name}/index.html`),
          filename: `${name}.html`,
          chunks: [name],
          inject: "body",
        })
      );
    }
  });
  return {
    entry: pageConfig,
    plugins,
  };
}
const pageConfig = getPages();
module.exports = {
  entry: pageConfig.entry,
  output: {
    filename: "[name].[chunkhash].js",
    chunkFilename: "[name].[chunkhash].js",
    path: path.resolve(__dirname, "dist"),
    crossOriginLoading: "anonymous",
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.onnx$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: '/models/', // 指定输出目录
            },
          },
        ],
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
      publicPath: "/ai-demo",
    },
    compress: true,
    port: 9004,
  },
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": false,
      "vm": require.resolve("vm-browserify"),
    }
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  entry: pageConfig.entry,
  plugins: [
    ...pageConfig.plugins,
    new CopyPlugin({
      patterns: [{ from: "public", to: "./" }],
    }),
    new CopyPlugin({
      patterns: [{ from: "node_modules/@mainto/ai-face-sdk/dist/ort-wasm-simd.wasm", to: "./" },{
        from: "node_modules/@mainto/ai-face-sdk/dist/model/", to: "./model"
      }],
    }),
  ],
};