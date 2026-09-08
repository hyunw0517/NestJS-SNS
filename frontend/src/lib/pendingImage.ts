// 아직 업로드하지 않고 브라우저에만 들고 있는 이미지 파일 + 미리보기 URL.
// PostComposer(신규 작성)와 PostCard(수정) 양쪽에서 동일하게 쓴다.
export interface PendingImage {
  id: string
  file: File
  previewUrl: string
}

// 한 게시글에 첨부 가능한 최대 이미지 수.
// Backend(images: string[])에는 개수 제한이 없지만, 카드 UI가 2x2 그리드로
// 보여주기 적당한 선(트위터 등 유사 서비스의 통상적인 상한)에 맞춰 프론트에서만 제한한다.
export const MAX_POST_IMAGES = 4

export function createPendingImages(files: File[]): PendingImage[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }))
}

export function revokePendingImage(image: PendingImage) {
  URL.revokeObjectURL(image.previewUrl)
}

// '/public/posts/xxx.png' -> 'xxx.png'. Backend PATCH images에는 파일명만 보낸다.
export function extractImageFileName(url: string) {
  return url.split('/').pop() ?? url
}
