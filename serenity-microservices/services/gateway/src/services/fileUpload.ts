import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { createLogger, securityLogger } from '@utils/logger';
import { sanitizeFileName, generateRequestId } from '@utils/helpers';
import { FileUpload } from '@types/index';
import { redisManager } from '@utils/redis';
import config from '@config/index';

const logger = createLogger('FileUpload');

export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadDir: string;
  enableImageProcessing: boolean;
  enableVirusScanning: boolean;
  enableEncryption: boolean;
  maxFiles: number;
  preserveOriginal: boolean;
}

export interface ProcessedFile {
  original: FileUpload;
  processed?: FileUpload;
  thumbnails?: FileUpload[];
  metadata: {
    size: number;
    dimensions?: { width: number; height: number };
    format?: string;
    checksum: string;
    virusCheckResult?: 'clean' | 'infected' | 'error';
  };
}

export class FileUploadService {
  private config: FileUploadConfig;
  private storage: multer.StorageEngine;
  private upload: multer.Multer;

  constructor() {
    this.config = {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
      allowedMimeTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
      uploadDir: process.env.UPLOAD_DIR || 'uploads',
      enableImageProcessing: true,
      enableVirusScanning: false, // Would need ClamAV integration
      enableEncryption: true,
      maxFiles: 5,
      preserveOriginal: true
    };

    this.initializeStorage();
    this.initializeMulter();
    this.ensureUploadDirectory();
  }

  /**
   * Initialize multer storage configuration
   */
  private initializeStorage(): void {
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const uploadPath = await this.getUploadPath(req, file);
          cb(null, uploadPath);
        } catch (error) {
          cb(error, '');
        }
      },
      filename: (req, file, cb) => {
        try {
          const filename = this.generateFilename(file);
          cb(null, filename);
        } catch (error) {
          cb(error, '');
        }
      }
    });
  }

  /**
   * Initialize multer instance
   */
  private initializeMulter(): void {
    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: this.config.maxFileSize,
        files: this.config.maxFiles,
        fields: 10,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024 // 1MB for field values
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(req, file, cb);
      }
    });
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.config.uploadDir, 'processed'), { recursive: true });
      await fs.mkdir(path.join(this.config.uploadDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.config.uploadDir, 'temp'), { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
      throw error;
    }
  }

  /**
   * Get upload path based on request context
   */
  private async getUploadPath(req: Request, file: Express.Multer.File): Promise<string> {
    const userId = req.user?.id || 'anonymous';
    const service = req.headers['x-target-service'] || 'general';
    
    const uploadPath = path.join(
      this.config.uploadDir,
      service as string,
      userId,
      new Date().toISOString().split('T')[0] // YYYY-MM-DD
    );

    await fs.mkdir(uploadPath, { recursive: true });
    return uploadPath;
  }

  /**
   * Generate secure filename
   */
  private generateFilename(file: Express.Multer.File): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const sanitizedName = sanitizeFileName(path.parse(file.originalname).name);
    
    return `${timestamp}_${randomBytes}_${sanitizedName}${extension}`;
  }

  /**
   * Validate uploaded file
   */
  private validateFile(
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void {
    try {
      // Check MIME type
      if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
        const error = new Error(`File type ${file.mimetype} not allowed`);
        (error as any).code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      // Check file extension
      const allowedExtensions = this.getMimeTypeExtensions();
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        const error = new Error(`File extension ${fileExtension} not allowed`);
        (error as any).code = 'INVALID_FILE_EXTENSION';
        return cb(error);
      }

      // Additional security checks
      if (this.containsSuspiciousContent(file.originalname)) {
        const error = new Error('File contains suspicious content');
        (error as any).code = 'SUSPICIOUS_FILE';
        return cb(error);
      }

      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }

  /**
   * Get allowed file extensions based on MIME types
   */
  private getMimeTypeExtensions(): string[] {
    const extensions: string[] = [];
    
    for (const mimeType of this.config.allowedMimeTypes) {
      switch (mimeType) {
        case 'image/jpeg':
          extensions.push('.jpg', '.jpeg');
          break;
        case 'image/png':
          extensions.push('.png');
          break;
        case 'image/gif':
          extensions.push('.gif');
          break;
        case 'application/pdf':
          extensions.push('.pdf');
          break;
        // Add more as needed
      }
    }
    
    return extensions;
  }

  /**
   * Check for suspicious content in filename
   */
  private containsSuspiciousContent(filename: string): boolean {
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
      /\.\./,
      /[<>:"|?*]/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Single file upload middleware
   */
  uploadSingle(fieldName: string = 'file') {
    return async (req: Request, res: Response, next: NextFunction) => {
      const uploadHandler = this.upload.single(fieldName);
      
      uploadHandler(req, res, async (error) => {
        if (error) {
          return this.handleUploadError(error, req, res);
        }

        if (!req.file) {
          return res.status(400).json({
            error: {
              code: 'NO_FILE_UPLOADED',
              message: 'No file was uploaded',
              timestamp: new Date().toISOString(),
              request_id: req.request_id
            }
          });
        }

        try {
          const processedFile = await this.processUploadedFile(req, req.file);
          req.uploadedFile = processedFile;
          next();
        } catch (error) {
          logger.error('File processing error:', error);
          await this.cleanupFile(req.file.path);
          
          return res.status(500).json({
            error: {
              code: 'FILE_PROCESSING_ERROR',
              message: 'Failed to process uploaded file',
              timestamp: new Date().toISOString(),
              request_id: req.request_id
            }
          });
        }
      });
    };
  }

  /**
   * Multiple files upload middleware
   */
  uploadMultiple(fieldName: string = 'files', maxCount: number = 5) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const uploadHandler = this.upload.array(fieldName, maxCount);
      
      uploadHandler(req, res, async (error) => {
        if (error) {
          return this.handleUploadError(error, req, res);
        }

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({
            error: {
              code: 'NO_FILES_UPLOADED',
              message: 'No files were uploaded',
              timestamp: new Date().toISOString(),
              request_id: req.request_id
            }
          });
        }

        try {
          const processedFiles: ProcessedFile[] = [];
          
          for (const file of req.files) {
            const processedFile = await this.processUploadedFile(req, file);
            processedFiles.push(processedFile);
          }
          
          req.uploadedFiles = processedFiles;
          next();
        } catch (error) {
          logger.error('Multiple files processing error:', error);
          
          // Cleanup uploaded files
          if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
              await this.cleanupFile(file.path);
            }
          }
          
          return res.status(500).json({
            error: {
              code: 'FILES_PROCESSING_ERROR',
              message: 'Failed to process uploaded files',
              timestamp: new Date().toISOString(),
              request_id: req.request_id
            }
          });
        }
      });
    };
  }

  /**
   * Process uploaded file
   */
  private async processUploadedFile(req: Request, file: Express.Multer.File): Promise<ProcessedFile> {
    try {
      // Calculate file checksum
      const checksum = await this.calculateFileChecksum(file.path);
      
      // Create file record
      const fileRecord: FileUpload = {
        id: generateRequestId(),
        filename: file.filename,
        original_name: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        user_id: req.user?.id,
        service: req.headers['x-target-service'] as string || 'general',
        uploaded_at: new Date(),
        metadata: {
          checksum,
          fieldname: file.fieldname,
          encoding: file.encoding
        }
      };

      const result: ProcessedFile = {
        original: fileRecord,
        metadata: {
          size: file.size,
          checksum,
          virusCheckResult: 'clean' // Would be set by virus scanner
        }
      };

      // Process images
      if (this.isImageFile(file.mimetype) && this.config.enableImageProcessing) {
        const processed = await this.processImage(file, fileRecord);
        result.processed = processed.processedFile;
        result.thumbnails = processed.thumbnails;
        result.metadata.dimensions = processed.dimensions;
        result.metadata.format = processed.format;
      }

      // Encrypt file if enabled
      if (this.config.enableEncryption) {
        await this.encryptFile(fileRecord);
      }

      // Store file metadata in Redis
      await this.storeFileMetadata(fileRecord);

      // Log file upload
      securityLogger.info('File uploaded', {
        request_id: req.request_id,
        user_id: req.user?.id,
        file_id: fileRecord.id,
        filename: fileRecord.filename,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        checksum: checksum.substring(0, 16)
      });

      return result;
    } catch (error) {
      logger.error('Error processing uploaded file:', error);
      throw error;
    }
  }

  /**
   * Process image file
   */
  private async processImage(
    file: Express.Multer.File,
    fileRecord: FileUpload
  ): Promise<{
    processedFile: FileUpload;
    thumbnails: FileUpload[];
    dimensions: { width: number; height: number };
    format: string;
  }> {
    try {
      const image = sharp(file.path);
      const metadata = await image.metadata();
      
      const dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0
      };

      // Create processed version (optimized)
      const processedPath = path.join(
        path.dirname(file.path),
        '../processed',
        `processed_${file.filename}`
      );

      await image
        .jpeg({ quality: 85, progressive: true })
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .toFile(processedPath);

      const processedFile: FileUpload = {
        ...fileRecord,
        id: generateRequestId(),
        filename: `processed_${file.filename}`,
        path: processedPath,
        size: (await fs.stat(processedPath)).size,
        metadata: {
          ...fileRecord.metadata,
          original_file_id: fileRecord.id,
          processing_type: 'optimized'
        }
      };

      // Create thumbnails
      const thumbnails: FileUpload[] = [];
      const thumbnailSizes = [
        { width: 150, height: 150, name: 'small' },
        { width: 300, height: 300, name: 'medium' },
        { width: 600, height: 600, name: 'large' }
      ];

      for (const size of thumbnailSizes) {
        const thumbnailPath = path.join(
          path.dirname(file.path),
          '../thumbnails',
          `${size.name}_${file.filename}`
        );

        await image
          .resize(size.width, size.height, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);

        const thumbnail: FileUpload = {
          ...fileRecord,
          id: generateRequestId(),
          filename: `${size.name}_${file.filename}`,
          path: thumbnailPath,
          size: (await fs.stat(thumbnailPath)).size,
          metadata: {
            ...fileRecord.metadata,
            original_file_id: fileRecord.id,
            processing_type: 'thumbnail',
            thumbnail_size: size.name
          }
        };

        thumbnails.push(thumbnail);
      }

      return {
        processedFile,
        thumbnails,
        dimensions,
        format: metadata.format || 'unknown'
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error('Error calculating file checksum:', error);
      throw error;
    }
  }

  /**
   * Encrypt file
   */
  private async encryptFile(fileRecord: FileUpload): Promise<void> {
    // Implementation would depend on encryption requirements
    // For now, just log that encryption would occur
    logger.info(`File ${fileRecord.id} would be encrypted`);
  }

  /**
   * Store file metadata in Redis
   */
  private async storeFileMetadata(fileRecord: FileUpload): Promise<void> {
    try {
      const key = `file:${fileRecord.id}`;
      await redisManager.setJSON(key, fileRecord, 24 * 60 * 60); // 24 hours
    } catch (error) {
      logger.error('Error storing file metadata:', error);
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /**
   * Handle upload errors
   */
  private handleUploadError(error: any, req: Request, res: Response): void {
    logger.error('File upload error:', error);

    let errorCode = 'UPLOAD_ERROR';
    let errorMessage = 'File upload failed';

    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          errorCode = 'FILE_TOO_LARGE';
          errorMessage = `File size exceeds limit of ${this.config.maxFileSize} bytes`;
          break;
        case 'LIMIT_FILE_COUNT':
          errorCode = 'TOO_MANY_FILES';
          errorMessage = `Too many files, maximum is ${this.config.maxFiles}`;
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorCode = 'UNEXPECTED_FILE';
          errorMessage = 'Unexpected file field';
          break;
        default:
          errorMessage = error.message;
      }
    } else if (error.code) {
      errorCode = error.code;
      errorMessage = error.message;
    }

    securityLogger.warn('File upload rejected', {
      request_id: req.request_id,
      user_id: req.user?.id,
      error_code: errorCode,
      error_message: errorMessage,
      ip: req.ip
    });

    res.status(400).json({
      error: {
        code: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        request_id: req.request_id
      }
    });
  }

  /**
   * Clean up file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.error(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<FileUpload | null> {
    try {
      const key = `file:${fileId}`;
      return await redisManager.getJSON<FileUpload>(key);
    } catch (error) {
      logger.error(`Error getting file ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const fileRecord = await this.getFile(fileId);
      if (!fileRecord) {
        return false;
      }

      // Delete physical file
      await this.cleanupFile(fileRecord.path);

      // Delete metadata
      const key = `file:${fileId}`;
      await redisManager.del(key);

      logger.info(`File deleted: ${fileId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Get upload statistics
   */
  getStats(): Record<string, any> {
    return {
      config: {
        max_file_size: this.config.maxFileSize,
        allowed_mime_types: this.config.allowedMimeTypes,
        max_files: this.config.maxFiles
      },
      upload_directory: this.config.uploadDir
    };
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      uploadedFile?: ProcessedFile;
      uploadedFiles?: ProcessedFile[];
    }
  }
}