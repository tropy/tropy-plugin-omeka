'use strict'

function flatten(arr) {
  return arr.reduce((acc, x) => acc.concat(x))
}

module.exports = {
  flatten
}
