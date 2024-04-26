
/* IMPORT */

const path = require('path');

/* CONFIG */

const config = {
    target: 'node',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode',
        fsevents: 'commonjs fsevents'
    },
    node: {
        __dirname: false
    },
    resolve: {
        extensions: ['tsx', '.ts', '.jsx', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true
                    }
                }
            ]
        }]
    }
}

/* EXPORT */

module.exports = config;