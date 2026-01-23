/* IMPORT */

const path = require("path");
const webpack = require("webpack");

/* CONFIG */

const config = {
  target: "node",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "file:///[absolute-resource-path]",
  },
  devtool: process.env.NODE_ENV === "production" ? false : "source-map",
  externals: {
    vscode: "commonjs vscode",
    fsevents: "commonjs fsevents",
  },
  node: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __dirname: false,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
    usedExports: true,
  },
  performance: {
    hints: false,
  }
};

/* EXPORT */

module.exports = config;
