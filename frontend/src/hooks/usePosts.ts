import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadImage } from '@/api/common'
import { createPost, deletePost, getPost, getPosts, likePost, unlikePost, updatePost } from '@/api/posts'
import type { GetPostsParams } from '@/types/post'

type PostsFilters = Omit<GetPostsParams, 'cursor'>

// Profile의 Posts/Media 탭처럼 같은 hook을 필터만 다르게 재사용할 때, 지금 보이는
// 탭의 쿼리만 활성화하고 싶은 경우를 위한 최소한의 확장(기본값 true라 기존 호출부는
// 그대로 동작한다).
export function usePostsInfiniteQuery(filters: PostsFilters = {}, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['posts', filters],
    queryFn: ({ pageParam }) => getPosts({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.after ?? undefined,
    enabled: options.enabled ?? true,
  })
}

export function usePostQuery(postId: number) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId),
    enabled: !Number.isNaN(postId),
    retry: false,
  })
}

interface CreatePostInput {
  content: string
  imageFiles: File[]
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    // 이미지가 있으면 먼저 각각 업로드해 fileName을 받고, 그 값을 그대로
    // POST /posts의 images로 넘긴다. Backend 업로드 API가 파일 1개씩만 받으므로
    // 여러 장이면 순서대로(반드시 순차일 필요는 없지만 단순하게) 병렬 업로드한다.
    mutationFn: async ({ content, imageFiles }: CreatePostInput) => {
      const images = await Promise.all(imageFiles.map((file) => uploadImage(file)))

      return createPost({ content, images })
    },
    // optimistic update 없이, 성공하면 posts 목록을 다시 불러오는 가장 단순한 방식.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

interface UpdatePostInput {
  postId: number
  content: string
  // undefined: 이미지 관련 변경 없음 -> images 필드 자체를 안 보내 기존 이미지를 그대로 둔다.
  // 값이 있으면 "최종적으로 남아야 할 이미지 구성"을 의미한다.
  //   keepFileNames: 유지할 기존 이미지들의 파일명(순서대로) - 이 목록에 없는 기존 이미지는 삭제된다.
  //   newFiles: 새로 추가할 파일들(업로드 후 keepFileNames 뒤에 이어붙여 전송)
  imagesChange?: {
    keepFileNames: string[]
    newFiles: File[]
  }
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, content, imagesChange }: UpdatePostInput) => {
      if (!imagesChange) {
        // images 필드를 아예 보내지 않아 기존 이미지를 그대로 둔다.
        return updatePost(postId, { content })
      }

      const uploadedFileNames = await Promise.all(imagesChange.newFiles.map((file) => uploadImage(file)))

      return updatePost(postId, {
        content,
        images: [...imagesChange.keepFileNames, ...uploadedFileNames],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// optimistic update 없이, 현재 liked 상태를 받아 반대 API를 호출하고 성공하면
// posts 목록 + 해당 post 상세 캐시를 무효화하는 가장 단순한 방식.
export function useTogglePostLikeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: number; liked: boolean }) =>
      liked ? unlikePost(postId) : likePost(postId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
