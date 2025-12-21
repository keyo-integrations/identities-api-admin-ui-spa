import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static files from src/static (development) or dist/static (production)
  const staticPath = process.env.NODE_ENV === 'production' 
    ? join(__dirname, 'static')
    : join(process.cwd(), 'src', 'static');
  app.useStaticAssets(staticPath, {
    prefix: '/static/',
  });
  
  app.enableCors();
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  
  await app.listen(port);
  Logger.log(`Server running on port ${port}`);
}
bootstrap();

