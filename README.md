# NestJS SNS

X(Twitter)를 모델로 한 SNS 웹 애플리케이션. NestJS + TypeORM 백엔드와 React + TypeScript 프론트엔드로 구성된 모노레포입니다.

## Tech Stack

**Backend**
- NestJS, TypeORM, PostgreSQL 17
- JWT(Access/Refresh) 기반 인증
- Socket.IO(실시간 채팅)
- class-validator / class-transformer

**Frontend**
- React + TypeScript + Vite
- TanStack Query(서버 상태 관리)
- React Router
- Tailwind CSS + Radix UI(shadcn/ui 계열 컴포넌트)
- Axios, socket.io-client

## 실행 방법

### 1. DB 실행 (Docker)

```bash
docker compose up -d
```

`docker-compose.yaml`은 `.env`의 `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` 값을 그대로 사용합니다.

### 2. Backend

`backend/.env`에 아래 값을 설정합니다.

```
PROTOCOL=http
HOST=localhost:3000

JWT_SECRET=...
HASH_ROUNDS=10

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...
```

```bash
cd backend
npm install
npm run start:dev
```

`synchronize: true`로 동작하므로 별도 마이그레이션 없이 서버 기동 시 스키마가 자동 반영됩니다. 기본적으로 `http://localhost:3000`에서 실행됩니다.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

기본적으로 `http://localhost:5173`에서 실행되며, `vite.config.ts`의 dev 서버 프록시(`/api`, `/public`, `/socket.io`)를 통해 `http://localhost:3000` 백엔드와 통신합니다.

## 주요 기능

### Auth
- 이메일/비밀번호 회원가입 및 로그인
- Access/Refresh Token(JWT) 기반 인증, Refresh Token으로 Access Token 재발급
- 동시에 여러 요청이 401을 받아도 Refresh는 한 번만 수행되는 single-flight 재발급
- 로그아웃 시 클라이언트 캐시(TanStack Query) 전체 초기화로 계정 전환 간 데이터 오염 방지

### Posts / Comments / Likes
- 게시글 CRUD, 게시글당 다중 이미지 업로드(추가/유지/삭제 동기화)
- 게시글/댓글 좋아요, cursor 기반 무한 스크롤
- 댓글에 무제한 중첩 답글(대댓글) 작성, 답글은 지연 로딩(펼치기 전 요청하지 않음)

### Profile / Follow
- 공개 프로필 조회, 본인 프로필 Edit(닉네임/handle/bio/프로필·커버 이미지)
- Posts / Replies / Media 탭
- 팔로우/언팔로우, Followers/Following 목록(cursor 기반 무한 스크롤)

### Messages(1:1 DM + 그룹 채팅)
- REST(메시지 history 조회)와 Socket.IO(실시간 송수신)를 함께 사용하는 구조
  - 대화 목록 조회, 과거 메시지는 REST cursor pagination
  - 신규 메시지는 Socket.IO(`enter_chat` / `send_message` / `receive_message`)로 실시간 전달
- DIRECT(1:1) / GROUP(그룹) 채팅이 하나의 대화 목록·화면 구조를 공유
- 그룹 멤버는 `ChatMembersModel`(chat-user 관계의 명시적 중간 엔티티)로 관리되며 `role`(OWNER/MEMBER)과 `joinedAt`/`leftAt`을 가짐
- 그룹 생성(생성자 OWNER), OWNER 전용 멤버 초대(재초대 포함), 자진 퇴장
- OWNER가 퇴장하면 가장 먼저 참여한 멤버에게 OWNER 자동 이전
- 멤버의 `joinedAt` 이전에 작성된 메시지는 해당 멤버에게 조회되지 않음(초대/재초대 이전 대화 비노출)
- 채팅방 비참여자는 REST(403/404)와 Socket 양쪽에서 접근 차단

## 구현하지 않은 기능

- 읽음 확인(read receipt), 실시간 접속 상태(online presence), 타이핑 표시
- 이미지/파일 메시지, 메시지 수정/삭제
- 그룹 멤버 강퇴, 그룹 이름 수정, ADMIN 전용 관리 기능
- 알림(Notification), 게시글 검색/추천(Explore)
