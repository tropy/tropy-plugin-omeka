'use strict'

const { expect } = require('chai')
const nock = require('nock')
const { OmekaApi } = require('../src/api')
const { URL } = require('../src/constants')
const fixtures = require('./fixtures')

const API_URL = 'http://mock.url/api'

describe('Mocked requests', () => {
  beforeEach(() => {
    nock(API_URL)
      .get(URL.PROPS)
      .query(true)
      .reply(200, fixtures.properties)
      .get(URL.VOCABS)
      .query(true)
      .reply(200, fixtures.vocabularies)
  })

  it('getProperties', async () => {
    const api = new OmekaApi({ url: API_URL })
    await api.getProperties()
    expect(api.properties).to.eql({
      ns1short1: 1,
      ns2short2: 2
    })
  })
})
