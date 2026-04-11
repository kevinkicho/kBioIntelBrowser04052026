class IntersectionObserverMock {
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}
  
  observe(target: Element) {
    this.callback([{
      isIntersecting: true,
      target,
      intersectionRatio: 1,
      time: 0,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
    }], this);
  }
  
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});