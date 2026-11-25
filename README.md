# NestJS SNS

NestJS 백엔드 학습을 위해 강의를 따라 만든 SNS 서비스입니다.
이 프로젝트에서 익힌 인증·트랜잭션·실시간 통신 구조를 바탕으로, 이후 [기관 인트라넷](https://github.com/hyunw0517/intranet)을 직접 설계해 확장했습니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Backend | NestJS 10, TypeScript, TypeORM |
| Database | PostgreSQL (Docker Compose) |
| Frontend | React, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Realtime | Socket.IO |

## 주요 기능

- JWT 기반 인증 (Access Token / Refresh Token)
- 게시글 CRUD, 댓글, 좋아요
- 이미지 업로드 및 정적 파일 제공
- 게시글 무한 스크롤
- 트랜잭션 처리
- Socket.IO 기반 메신저

## 실행 방법

<!-- TODO: 실제 명령어와 환경 변수 이름을 확인해 채우기 -->

```bash
# 1. PostgreSQL 실행
docker compose up -d

# 2. 백엔드 실행
cd backend
npm install
npm run start:dev

# 3. 프론트엔드 실행
cd frontend
npm install
npm run dev
```

환경 변수는 `.env.example`을 참고해 `.env`를 만듭니다.
