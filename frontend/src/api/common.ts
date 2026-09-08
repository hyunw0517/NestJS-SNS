import { apiClient } from '@/lib/apiClient'

interface UploadImageResponse {
  fileName: string
}

// Backend POST /common/image: FileInterceptor('image')로 field name이 'image'로
// 고정되어 있고, 한 번에 파일 1개만 받는다. 응답의 fileName은 임시 폴더에 저장된
// 파일명 그대로이며, 이 값을 POST /posts의 images 배열에 그대로 넣으면 된다.
//
// FormData를 그대로 넘기면 axios/브라우저가 boundary가 포함된
// multipart/form-data Content-Type을 자동으로 채우므로 직접 지정하지 않는다.
export async function uploadImage(file: File) {
  const formData = new FormData()
  formData.append('image', file)

  const { data } = await apiClient.post<UploadImageResponse>('/common/image', formData)

  return data.fileName
}
