const fs = require('fs-extra')
const execa = require('execa')
const path = require('path')
const readPkg = require('read-pkg')
const { info, warn, error } = require('prettycli')

/* get version from root package.json */
const { version } = readPkg.sync(path.resolve(__dirname, '../package.json'))

/* create dist folder */
fs.removeSync('dist')
fs.mkdirsSync('dist')
info('PUBLISH', 'created dist')

const directories = ['src/tokens', 'src/babel-preset', 'src/components']

/* copy tokens and preset for publishing */
directories.forEach(directory => {
  fs.copySync(directory, directory.replace('src', 'dist'))
})
info('PUBLISH', 'copied files')

/* copy version to all dependencies */
directories.forEach(directory => {
  const packageJSONPath = directory.replace('src', 'dist') + '/package.json'
  let content = fs.readJsonSync(packageJSONPath)
  content.version = version

  /* components should import the same version of tokens and babel-preset */
  if (directory === 'src/components') {
    content.dependencies['auth0-cosmos-tokens'] = version
    content.dependencies['babel-preset-cosmos'] = version
  }

  fs.writeJsonSync(packageJSONPath, content)
})
info('PUBLISH', 'updated version')

/* transpile components */
const presetPath = path.resolve(__dirname, '../dist/babel-preset/index.js')
try {
  execa.shellSync(
    `./node_modules/.bin/babel --presets=${presetPath} src/components -d dist/components`
  )
  info('PUBLISH', 'transpiled components')
} catch (err) {
  console.log(err)
  process.exit(1)
}

/* publish all components */
try {
  execa.shellSync('cd dist/tokens && npm publish')
  info('PUBLISH', 'published tokens')
  execa.shellSync('cd dist/babel-preset && npm publish')
  info('PUBLISH', 'published preset')
  execa.shellSync('cd dist/components && npm publish')
  info('PUBLISH', 'published components')
} catch (err) {
  console.log(err)
  process.exit(1)
}
