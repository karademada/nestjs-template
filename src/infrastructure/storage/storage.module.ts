import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from '@core/services/storage.service';
import { MinioStorageProvider } from './providers/minio.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { FileRepository } from '../repositories/file.repository';
import storageConfig from '../config/storage.config';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    ConfigModule.forFeature(storageConfig),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  providers: [
    FileRepository,
    {
      provide: 'IFileRepository',
      useExisting: FileRepository,
    },
    StorageService,
    MinioStorageProvider,
    S3StorageProvider,
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (
        configService: ConfigService,
        minioProvider: MinioStorageProvider,
        s3Provider: S3StorageProvider,
      ) => {
        const driver = configService.get<string>('storage.driver');

        return driver === 's3' ? s3Provider : minioProvider;
      },
      inject: [ConfigService, MinioStorageProvider, S3StorageProvider],
    },
    {
      provide: 'STORAGE_SERVICE_INITIALIZATION',
      useFactory: (storageService: StorageService, storageProvider) => {
        storageService.setProvider(storageProvider);

        return true;
      },
      inject: [StorageService, 'STORAGE_PROVIDER'],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {
  static register(options?: { global?: boolean }): DynamicModule {
    return {
      module: StorageModule,
      global: options?.global || false,
    };
  }
}
