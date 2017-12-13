'use strict'

const { expect } = require('chai')
const { OmekaApi, ensureUrl } = require('../src/api')
const { TROPY } = require('../src/constants')

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

describe('Parse', () => {
  const { parseVocabs, parseProps } = require('../src/api')

  it('parseVocabs', () => {
    expect(parseVocabs()).to.eql({})
    expect(parseVocabs([])).to.eql({})
    expect(parseVocabs([
      {
        'o:prefix': 'dcterms',
        'o:namespace_uri': 'ns1',
        'o:id': 1
      },
      {
        'o:prefix': 'dctype',
        'o:namespace_uri': 'ns2',
        'o:id': 2
      }
    ])).to.eql({
      dcterms: 'ns1',
      dctype: 'ns2'
    })
  })

  it('parseProps', () => {
    const vocabs = {
      pfx1: 'ns1',
      pfx2: 'ns2'
    }
    const props = [
      {
        'o:id': 1,
        'o:term': 'pfx1:short1'
      },
      {
        'o:id': 2,
        'o:term': 'pfx2:short2'
      },
      {
        'o:id': 3,
        'o:term': 'pfxunknown:short2'
      }
    ]
    expect(parseProps(vocabs, [])).to.eql({})
    expect(parseProps(vocabs, props)).to.eql({
      ns1short1: 1,
      ns2short2: 2
    })
  })
})

describe('prepareItem', () => {
  const { prepareItem } = require('../src/api')

  const item = {
    prop1: [{
      '@type': 'type1',
      '@value': 'val1'
    }]
  }

  const props = {
    prop1: 1
  }

  it('prepares an item for sending to the API', () => {
    expect(prepareItem(item, props)).to.eql({
      [TROPY.ITEM]: [{
        'type': 'literal',
        'property_id': 1,
        '@value': 'val1'
      }]
    })
  })
})
