'use strict'

const { expect } = require('chai')
const fetchMock = require('fetch-mock')
const { OmekaApi } = require('../src/api')
const { URL } = require('../src/constants')
const { Plugin } = require('../src/plugin')
const fixtures = require('./fixtures')

const API_URL = 'http://mock.url/api'

const url = (route) => 'begin:' + API_URL + route // helper
var uploadCount = 2 // helper

fetchMock
  .get(url(URL.VOCABS), fixtures.vocabularies)
  .get(url(URL.PROPS), fixtures.properties)
  .post(url(URL.ITEMS), { 'o:id': 1 }) // item
  .post(url(URL.MEDIA), () => ({ // 2 photos and 1 selection
    'o:id': uploadCount++
  }))

describe('Mocked requests', () => {
  it('getProperties', async () => {
    const api = new OmekaApi({ url: API_URL }, { fetch })
    await api.getProperties()
    expect(api.properties).to.eql({
      ns1short1: 1,
      ns2short2: 2
    })

    expect(fetchMock.calls().length).to.eql(3)
  })

  it('Plugin', async () => {
    const plugin = new Plugin(
      { api: { url: API_URL } },
      { fetch, FormData }
    )
    const result = (await plugin.exec(fixtures.items))[0]
    expect(result.item).to.eql(1)
    expect(result.medias).to.have.members([2, 3, 4])

    expect(fetchMock.calls(url(URL.VOCABS)).length).to.eql(2)
    expect(fetchMock.calls(url(URL.PROPS)).length).to.eql(4)
    expect(fetchMock.calls(url(URL.ITEMS)).length).to.eql(1)
    expect(fetchMock.calls(url(URL.MEDIA)).length).to.eql(3)
  })

})
