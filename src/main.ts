import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

//NestJS를 실행하는 함수
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //전역 파이프 
  app.useGlobalPipes( new ValidationPipe({
    transform: true, // 요청 파라미터를 DTO에 정의한 타입으로 변환
    transformOptions: {
      enableImplicitConversion: true, // DTO에 정의한 타입으로 변환 시, 암묵적 형변환 허용
    }, 
    whitelist: true, // DTO에서 컬럼을 삭제한 경우 반영하기 위함. 
    forbidNonWhitelisted: true, // 존재하면 안 되는 Param 키 요청 막기. 
  }) ); 
  // ValidationPipe() -> 각 라우트마다 개별적으로 등록하지 않아도, 
  // DTO에 정의한 class-validator 규칙이 앱 전체 요청에 일괄 적용됨

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
