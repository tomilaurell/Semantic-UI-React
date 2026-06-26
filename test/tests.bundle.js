import './setup'

const testsContext = require.context('./', true, /-test\.js$/)
const testPaths = testsContext.keys().filter((path) => !path.includes('/node_modules/'))

// only re-run changed tests, or all if none changed
// https://www.npmjs.com/package/karma-webpack-with-fast-source-maps
const __karmaWebpackManifest__ = []
let runnable = testPaths.filter((path) => __karmaWebpackManifest__.indexOf(path) >= 0)

if (!runnable.length) runnable = testPaths

runnable.forEach(testsContext)
