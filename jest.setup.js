require("jest-fetch-mock").enableMocks();

// Polyfill Response.json() static method.
// jsdom's global Response lacks the (relatively new, 2022+) Response.json static.
// NextResponse.json() relies on it, so without this every API route test crashes.
if (typeof Response !== 'undefined' && typeof Response.json !== 'function') {
  Response.json = function (data, init = {}) {
    const headers = new Headers(init.headers || {});
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(data), { ...init, headers });
  };
}

jest.mock('d3', () => ({
  select: jest.fn().mockReturnValue({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
  }),
  scaleLinear: jest.fn().mockReturnValue(jest.fn()),
  scaleBand: jest.fn().mockReturnValue(jest.fn()),
  axisBottom: jest.fn().mockReturnValue(jest.fn()),
  axisLeft: jest.fn().mockReturnValue(jest.fn()),
}));