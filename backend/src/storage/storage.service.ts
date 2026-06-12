import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import type { Express } from 'express';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadPath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
  ];

  constructor(private configService: ConfigService) {
    this.uploadPath = path.resolve(
      this.configService.get<string>('UPLOAD_PATH', './uploads'),
    );
    this.maxFileSize = this.configService.get<number>(
      'MAX_FILE_SIZE',
      5 * 1024 * 1024,
    );
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      throw new BadRequestException('Failed to create upload directory');
    }
  }

  private async compressToWebP(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer).webp({ quality: 80 }).toBuffer();
    } catch (err) {
      this.logger.error('WebP compression failed', err);
      throw new BadRequestException(
        'Failed to compress image. Please try a different image.',
      );
    }
  }

  async saveFile(
    file: Express.Multer.File,
    subdir: string = 'general',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }

    const compressedBuffer = await this.compressToWebP(file.buffer);

    if (compressedBuffer.length > this.maxFileSize) {
      throw new BadRequestException(
        'Compressed file still exceeds 5MB. Please use a smaller image.',
      );
    }

    const filename = `${uuidv4()}.webp`;
    const targetDir = path.join(this.uploadPath, subdir);

    await this.ensureDir(targetDir);

    const fullPath = path.join(targetDir, filename);
    await fs.writeFile(fullPath, compressedBuffer);

    return `/uploads/${subdir}/${filename}`;
  }

  async deleteFile(relativeUrl: string): Promise<boolean> {
    if (!relativeUrl) return false;

    try {
      const relativePath = relativeUrl.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadPath, relativePath);

      const resolvedPath = path.resolve(fullPath);
      if (!resolvedPath.startsWith(path.resolve(this.uploadPath))) {
        this.logger.warn(`Path traversal detected: ${relativeUrl}`);
        return false;
      }

      await fs.unlink(resolvedPath);
      return true;
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        this.logger.warn(`File not found for deletion: ${relativeUrl}`);
        return false;
      }
      this.logger.error(`Failed to delete file: ${relativeUrl}`, err);
      return false;
    }
  }

  getFullPath(relativeUrl: string): string {
    const relativePath = relativeUrl.replace(/^\/uploads\//, '');
    return path.join(this.uploadPath, relativePath);
  }
}
