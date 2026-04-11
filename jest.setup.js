require("jest-fetch-mock").enableMocks();

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