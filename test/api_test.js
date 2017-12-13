const { expect } = require('chai')
const { OmekaApi, ensureUrl } = require('../src/api')

describe('API', () => {
  it('ensureUrl', () => {
    expect(ensureUrl('')).to.eql('/api')
    expect(ensureUrl('foo')).to.eql('foo/api')
    expect(ensureUrl('foo/')).to.eql('foo/api')
  })

  it('no config passed', () => {
    const api = new OmekaApi()
    expect(api.config.url).to.eql('http://<omeka_url>/api')
  })

  it('empty config passed', () => {
    const api = new OmekaApi({})
    expect(api.config.url).to.eql('http://<omeka_url>/api')
  })

  it('url passed', () => {
    const api = new OmekaApi({
      url: 'foo'
    })
    expect(api.config.url).to.eql('foo/api')
  })
})
