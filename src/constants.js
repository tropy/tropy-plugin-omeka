'use strict'

module.exports = {
  URL: {
    ITEMS: '/items',
    VOCABS: '/vocabularies',
    PROPS: '/properties',
    MEDIA: '/media'
  },
  TROPY: {
    NS: 'https://tropy.org/v1/tropy#',
    PHOTO: 'https://tropy.org/v1/tropy#photo',
    ITEM: 'https://tropy.org/v1/tropy#Item',
    PATH: 'https://tropy.org/v1/tropy#path',
    SELECTION: 'https://tropy.org/v1/tropy#selection',
    NOTE: 'https://tropy.org/v1/tropy#note',
    HTML: 'https://tropy.org/v1/tropy#html'
  },
  TITLES: [
    'http://purl.org/dc/terms/title',
    'http://purl.org/dc/elements/1.1/title'
  ],
  OMEKA: {
    // Can be removed if
    // https://github.com/omeka/omeka-s/issues/1171 gets resolved
    WHATEVER: 'hello-from-tropy'
  },
  API: {
    PER_PAGE: 100,
    MAX_PAGES: 100
  }
}
