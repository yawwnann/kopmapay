import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';

describe('StorageService', () => {
  let service: StorageService;
  let uploadDir: string;

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: any) => defaultVal),
  };

  beforeEach(async () => {
    uploadDir = path.join(os.tmpdir(), `kopma-test-${Date.now()}`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    (service as any).uploadPath = uploadDir;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  function createMockFile(
    buffer: Buffer,
    mimetype: string,
    originalname = 'test.jpg',
  ) {
    return {
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype,
      buffer,
      size: buffer.length,
    } as Express.Multer.File;
  }

  describe('saveFile', () => {
    it('should compress image to WebP and save', async () => {
      const inputBuffer = Buffer.from('original-image');
      const compressedBuffer = Buffer.from('compressed-webp');

      (sharp as jest.Mock).mockReturnValue({
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(compressedBuffer),
      });

      const result = await service.saveFile(
        createMockFile(inputBuffer, 'image/jpeg'),
        'proofs',
      );

      expect(sharp).toHaveBeenCalledWith(inputBuffer);
      expect(result).toMatch(/\.webp$/);
      const filename = result.split('/').pop()!;
      const filePath = path.join(uploadDir, 'proofs', filename);
      const content = await fs.readFile(filePath);
      expect(content).toEqual(compressedBuffer);
    });

    it('should compress PNG to WebP', async () => {
      const inputBuffer = Buffer.from('png-data');
      const compressedBuffer = Buffer.from('compressed-webp');

      (sharp as jest.Mock).mockReturnValue({
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(compressedBuffer),
      });

      const result = await service.saveFile(
        createMockFile(inputBuffer, 'image/png'),
        'proofs',
      );

      expect(result).toMatch(/\.webp$/);
    });

    it('should throw BadRequestException for unsupported MIME type', async () => {
      await expect(
        service.saveFile(
          createMockFile(Buffer.from('pdf content'), 'application/pdf'),
          'proofs',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when compressed output exceeds 5MB', async () => {
      const tooLarge = Buffer.alloc(6 * 1024 * 1024);

      (sharp as jest.Mock).mockReturnValue({
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(tooLarge),
      });

      await expect(
        service.saveFile(
          createMockFile(Buffer.from('large'), 'image/jpeg'),
          'proofs',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for no file provided', async () => {
      await expect(
        service.saveFile(null as any, 'proofs'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when compression fails', async () => {
      (sharp as jest.Mock).mockReturnValue({
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('corrupt image')),
      });

      await expect(
        service.saveFile(
          createMockFile(Buffer.from('bad'), 'image/jpeg'),
          'proofs',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
