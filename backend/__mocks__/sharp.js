module.exports = jest.fn(() => ({
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-compressed')),
}));
