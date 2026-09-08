import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";

export class PaginatePostDto extends BasePaginationDto {
    @IsNumber()
    @IsOptional()
    where__likeCount__more_than: number;

    @IsString()
    @IsOptional()
    where__title__i_like: string;

    // CommonService의 범용 where__ 파싱은 관계(author)를 다루지 못해(예: author.id를
    // 직접 필터링하려면 where: { author: { id } } 형태가 필요) PostsService.paginatePosts에서
    // 이 값만 따로 꺼내 override where로 조립한다(comments의 postId 필터와 동일한 방식).
    @IsNumber()
    @IsOptional()
    where__author_id?: number;

    // Profile Media 탭용: 이미지가 1장 이상 있는 게시글만 조회. 쿼리스트링은 항상
    // 문자열이라 implicit conversion만으로는 "false" 문자열이 true로 오해될 수 있어
    // 명시적으로 변환한다.
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    @IsOptional()
    where__has_images?: boolean;
}