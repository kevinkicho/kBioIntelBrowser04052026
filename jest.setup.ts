import '@testing-library/jest-dom'

// jsdom stubs for APIs not implemented in jsdom
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || jest.fn()
}
