import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'; // <--- 1. Import
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 2. Activate the Global Safety Net
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();