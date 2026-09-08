// Backend CommonService.cursorPaginate()의 응답 형태 그대로.
// posts 외에 comments 등 다른 리소스도 같은 형태를 쓰므로 제네릭으로 둔다.
export interface CursorPaginationResult<T> {
  data: T[]
  cursor: {
    after: number | null
  }
  count: number
  // Backend가 PROTOCOL/HOST 기준으로 만든 절대 URL이라 프론트에서 그대로 fetch하면
  // /api 프록시를 우회해 CORS에 걸린다. next는 "다음 페이지가 있는지" 판단용으로만
  // 쓰고, 실제 다음 요청은 cursor.after 값으로 직접 만든다.
  next: string | null
}
