import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

//NestJS를 실행하는 함수
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
