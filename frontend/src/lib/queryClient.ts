import { QueryClient } from '@tanstack/react-query'

// 옵션은 기본값 그대로 둔다. staleTime/retry/refetchOnWindowFocus 등은
// 실제 useQuery/useInfiniteQuery 사용 패턴이 나온 뒤 필요할 때 조정한다.
export const queryClient = new QueryClient()
