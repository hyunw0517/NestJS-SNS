import { FindManyOptions } from "typeorm";
import { PostsModel } from "../entity/posts.entity";


export const DEFAULT_POST_FIND_OPTIONS: FindManyOptions<PostsModel> = {
    relations: {
        author: true,
        images: true,
    },
    // 기본(join) 전략은 images처럼 1:N인 relation을 LEFT JOIN으로 가져오는데,
    // take/skip(cursor pagination)과 함께 쓰면 LIMIT이 게시글 수가 아니라
    // JOIN된 행 수에 적용된다. 그래서 이미지가 여러 장인 게시글 하나가 take를
    // 혼자 소모해버려 다른 게시글이 통째로 누락되는 문제가 있었다(실제 재현 확인).
    // relationLoadStrategy: 'query'는 relation을 별도 쿼리로 불러오게 해서
    // 메인 페이지네이션 쿼리가 posts 테이블만 대상으로 하도록 만든다.
    relationLoadStrategy: 'query',
}

// images 정렬은 posts.service.ts의 sortPostImages()에서 애플리케이션 레벨로 처리한다
// (relation 자체에 DB order를 걸 필요가 없다 - 'query' 전략이라 JOIN도 아니다).
