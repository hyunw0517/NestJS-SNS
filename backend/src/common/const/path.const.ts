import { join, posix } from "path";

// 서버 프로젝트의 루트 폴더
export const PROJECT_ROOT_PATH = process.cwd(); //cwd -> 프로젝트를 실행하는 위치

// 외부에서 접근 가능한 파일들을 모아놓은 폴더 이름
export const PUBLIC_FOLDER_NAME = 'public';

// 포스트 이미지를 저장할 폴더 이름
export const POSTS_FOLDER_NAME = 'posts';

// 임시 폴더 이름
export const TEMP_FOLDER_NAME = 'temp';

// 사용자 프로필/커버 이미지를 저장할 폴더 이름
export const USERS_FOLDER_NAME = 'users';

// 실제 공개 폴더의 절대 경로
// /{프로젝트 위치}/public
export const PUBLIC_FOLDER_PATH = join(
    PROJECT_ROOT_PATH, 
    PUBLIC_FOLDER_NAME, 
)

// 포스트 이미지를 저장할 폴더
// {프로젝트의 실제 경로}/public/posts
export const POST_IMAGE_PATH = join(
    PUBLIC_FOLDER_PATH, 
    POSTS_FOLDER_NAME, 
)

// 이미지 다운로드용 경로 (URL path이지 파일시스템 경로가 아니므로,
// Windows에서도 항상 '/'로만 이어지도록 posix.join을 사용한다)
// /public/posts/xxx.jpg
export const POST_PUBLIC_IMAGE_PATH = posix.join(
    PUBLIC_FOLDER_NAME,
    POSTS_FOLDER_NAME,
)

// 임시 파일들을 저장할 폴더
// {프로젝트의 실제 경로}/public/temp
export const TEMP_FOLDER_PATH = join(
    PUBLIC_FOLDER_PATH,
    TEMP_FOLDER_NAME,
)

// temp 폴더 업로드 파일명 형식. common.module의 multer가 항상 `${uuid()}${ext}`로 저장하므로
// 클라이언트가 보낸 파일명은 이 형식이어야 한다. '../../.env' 같은 값으로 temp 밖의 파일을
// public 폴더로 옮겨 노출시키는 경로 탐색을 막기 위해 temp 파일을 꺼내기 전에 반드시 검사한다.
export const TEMP_FILE_NAME_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i;

// 사용자 프로필/커버 이미지를 저장할 폴더
// {프로젝트의 실제 경로}/public/users
export const USERS_IMAGE_PATH = join(
    PUBLIC_FOLDER_PATH,
    USERS_FOLDER_NAME,
)

// /public/users
export const USERS_PUBLIC_IMAGE_PATH = posix.join(
    PUBLIC_FOLDER_NAME,
    USERS_FOLDER_NAME,
)
