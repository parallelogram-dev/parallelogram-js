const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const demo = (...p) => path.resolve(__dirname, 'apps/demo', ...p);

module.exports = {
    // 👇 make everything resolve relative to apps/demo
    context: demo(),

    entry: {
        app: [demo('src/js/main.js'), demo('src/scss/base.scss')]
    },

    output: {
        filename: 'js/[name].js',
        path: demo('web/asset'),
        publicPath: '/asset/',
        clean: true
    },

    resolve: {
        extensions: ['.js', '.mjs'],
        alias: {
            '@contenir/core': path.resolve(__dirname, 'packages/core/dist/index.js'),
            '@contenir/router': path.resolve(__dirname, 'packages/router/dist/index.js'),
            '@contenir/page': path.resolve(__dirname, 'packages/page/dist/index.js'),
            '@contenir/ui': path.resolve(__dirname, 'packages/ui/dist/index.js'),
            '@contenir/components': path.resolve(__dirname, 'packages/components/dist/index.js')
        }
    },

    module: {
        rules: [
            {
                test: /\.(scss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {loader: 'css-loader', options: {url: false, sourceMap: true}},
                    {loader: 'sass-loader', options: {sourceMap: true}}
                ]
            }
        ]
    },

    plugins: [new MiniCssExtractPlugin({filename: 'css/[name].css'})],

    devServer: {
        static: {directory: demo('web')},
        historyApiFallback: true,
        port: 5173
    },

    devtool: 'eval-source-map',
    mode: 'development',
    stats: 'minimal'
};
