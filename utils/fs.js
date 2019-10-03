const fs = require('fs')
const path = require('path')
const util = require('util')

{
  const asyncFuncRegistry = [
    { module: fs, funcs: ['stat', 'readdir'] },
  ]

  for (const entry of asyncFuncRegistry) {
    const { module: mod, funcs } = entry
    for (const funcName of funcs) {
      const asyncName = `${funcName}Async`
      mod[asyncName] = util.promisify(mod[funcName]) 
    }
  }
}

exports.traverse = async function traverse(directory, visitor, options) {
  const dirname = path.dirname(directory)
  const basename = path.basename(directory)
  await traverseImp(dirname, basename, visitor, options || {})
}

async function traverseImp (dirname, basename, visitor, options) {
  const fullname = path.normalize(path.join(dirname, basename))

  let stat
  try {
    stat = await fs.statAsync(fullname)
  } catch (error) {
    console.error(`Failed to stat file: ${fullname}`, error)
    const canSkip = error.code === 'ENOENT' || error.code === 'EACCES'
    if (canSkip) {
      return
    }
    throw error
  }
  if (!stat.isDirectory()) {
    await visitor({ dirname, basename, fullname })
    return
  }

  let files
  try {
    files = await fs.readdirAsync(fullname)
  } catch (error) {
    console.error(`Failed to readdirAsync: ${fullname}`, error)
    const canSkip = error.code === 'ENOENT' || error.code === 'EACCES'
    if (canSkip) {
      return
    }
    throw error
  }

  await visitor({
    dirname,
    basename,
    children: files,
    isDirectory: true,
    fullname
  })

  const prune = options.prune
    ? await options.prune(fullname).catch(() => false)
    : false;

  if (prune) {
    return
  }

  for (const file of files) {
    await traverseImp(fullname, file, visitor, options)
  }
}
