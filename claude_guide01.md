# 작업 목적

현재 프로젝트는 NestJS 백엔드 프로젝트가 Repository 루트에 직접 위치해 있다.

향후 React + TypeScript 프론트엔드를 추가하여 하나의 SNS 프로젝트로 관리할 예정이므로, 프로젝트를 `backend`와 `frontend` 기준의 구조로 개편한다.

# 목표 구조

```text
NestJS-SNS/
├── backend/
│   ├── src/
│   ├── test/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── eslint.config.mjs
│   └── .prettierrc
│
├── frontend/
│
├── docker-compose.yaml
├── .gitignore
└── README.md
```

# 작업 내용

## 1. NestJS 프로젝트 이동

현재 Repository 루트에 존재하는 NestJS 애플리케이션 관련 파일과 디렉토리를 `backend/` 하위로 이동한다.

예:

* `src/`
* `test/`
* `public/`
* `package.json`
* `package-lock.json`
* `nest-cli.json`
* `tsconfig.json`
* `tsconfig.build.json`
* ESLint / Prettier 관련 설정 파일

기존 백엔드 코드의 기능과 디렉토리 구조는 변경하지 않는다.

## 2. 프로젝트 공통 파일

다음과 같이 프로젝트 전체에 관계되는 파일은 Repository 루트에 유지한다.

* `.git/`
* `.gitignore`
* `README.md`
* `docker-compose.yaml`

단, 파일 이동으로 인해 경로 수정이 필요한 설정이 있다면 수정한다.

## 3. Frontend 디렉토리

Repository 루트에 `frontend/` 디렉토리를 준비한다.

아직 React 애플리케이션 구현은 진행하지 않는다.

프론트엔드는 이후 React + TypeScript + Vite 기반으로 구성할 예정이다.

## 4. 기존 코드 보존

이번 작업의 목적은 프로젝트 구조 개편이다.

따라서 다음 작업은 하지 않는다.

* NestJS 비즈니스 로직 리팩터링
* Controller / Service / Module 구조 변경
* TypeORM 구조 변경
* API 명세 변경
* 변수명 및 함수명 변경
* 불필요한 패키지 업그레이드
* 기능 추가 또는 삭제

기존 백엔드가 동일하게 동작하도록 유지한다.

# 경로 점검

파일 이동으로 영향을 받을 수 있는 다음 부분을 확인하고 필요한 경우 수정한다.

* 정적 파일 경로
* Multer 업로드 경로
* 환경변수 파일 경로
* Docker volume 경로
* TypeORM 관련 경로
* Nest CLI 설정
* TypeScript 설정
* npm script

# 완료 조건

작업 완료 후 다음 조건을 만족해야 한다.

1. Repository 루트가 `backend`, `frontend` 중심 구조로 정리되어 있을 것
2. 기존 NestJS 코드가 `backend/` 내부에서 정상적으로 존재할 것
3. `cd backend && npm run start:dev` 실행이 정상적으로 가능할 것
4. 기존 API 기능이 구조 변경 전과 동일하게 동작할 것
5. 기존 Git Repository를 그대로 유지할 것
6. `frontend/` 내부에 별도의 Git Repository를 생성하지 않을 것

작업이 끝난 후 변경한 파일과 경로를 요약해서 알려준다.
