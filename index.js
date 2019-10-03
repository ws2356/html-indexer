const fs = require('fs')
const util = require('util')
const path = require('path')
const ejs = require('ejs')
const config = require('./config')
const { traverse } = require('./utils/fs')

{
  const asyncFuncRegistry = [
    { module: fs, funcs: ['stat', 'exists', 'readFile', 'writeFile'] },
  ]
  for (const entry of asyncFuncRegistry) {
    const { module: mod, funcs } = entry
    for (const funcName of funcs) {
      const asyncName = `${funcName}Async`
      mod[asyncName] = util.promisify(mod[funcName]) 
    }
  }
}

async function main() {
  await config.loadConfig()
  const templateFile = path.join(__dirname, 'views/index.ejs')
  const ejsStr = (await fs.readFileAsync(templateFile)).toString()
  const render = ejs.compile(ejsStr, { async: true })

  async function processEntry({ fullname, children, isDirectory, dirname, basename }) {
    if (!isDirectory) {
      return;
    }
    const indexFile = `${fullname}/index.html`
    if (await fs.existsAsync(indexFile)
      && await config.isNoOverwrite(indexFile)) {
      return;
    }

    const indexContent = await render({
      files: children.filter(item => item !== 'index.html'),
      basename
    })
    await fs.writeFileAsync(indexFile, indexContent)
  }
  async function prune(fullname) {
    return config.isPrune(fullname)
  }
  await traverse('.', processEntry, { prune });
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error('Failed to create index.html files: ', error)
    process.exit(error.errno || -1)
  })
