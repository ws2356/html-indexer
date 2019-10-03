const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const util = require('util')

const readFileAsync = util.promisify(fs.readFile)

const DEFAULT_CONFIG_FILE='.html-indexer'
const DEFAULT_CONFIG = {
  noOverwrite: [],
  ignore: []
}

// format
// { "noOverwrite": ["some/subdir/index.html"], "ignore": [regs...] }

class Config {
  constructor() {
    this.config = null
  }

  async loadConfig(fromFile) {
    const configFile = fromFile || DEFAULT_CONFIG_FILE
    let configObj
    try {
      const configStr = await readFileAsync(configFile)
      configObj = JSON.parse(configStr.toString())
    } catch (error) {
      if (error.code === 'ENOENT') {
        configObj = _.cloneDeep(DEFAULT_CONFIG)
      } else {
        console.error('Failed to loadConfig: ', error)
        throw error
      }
    }
    configObj.noOverwriteREs = _.castArray(configObj.noOverwrite || [])
      .map(reStr => new RegExp(reStr, 'i'))
    configObj.ignoreREs = _.castArray(configObj.ignore || [])
      .map(reStr => new RegExp(reStr, 'i'))

    this.config = configObj
  }

  isNoOverwrite(fullname) {
    const normname = path.normalize(fullname)
    return !!this.config.noOverwriteREs.find(item => {
      return item.test(normname)
    })
  }

  isPrune (fullname) {
    const normname = path.normalize(fullname)
    return !!this.config.ignoreREs.find(item => {
      return item.test(normname)
    })
  }
}

module.exports = new Config()
