import { IsIn, IsNumber, IsOptional } from "class-validator";

export class BasePaginationDto {
    @IsNumber()
    @IsOptional()
    page?: number;

    @IsNumber()
    @IsOptional()
    where__id__less_than?: number;

    // 이전 마지막 데이터의 ID
    // 프로퍼티에 입력된 ID보다 높은 ID 값부터 가져오기
    //@Type(() => Number) -> transform 옵션에서 enableImplicitConversion: true 설정 시, @Type() 데코레이터를 사용하지 않아도 됨
    @IsNumber()
    @IsOptional()
    where__id__more_than?: number;

    // 정렬
    // createdAt 기준으로 오름차/내림차순 정렬
    @IsIn(['ASC', 'DESC'])
    @IsOptional()
    order__createdAt: 'ASC' | 'DESC' = 'ASC';

    // 몇 개의 데이터를 응답으로 받을지
    @IsNumber()
    @IsOptional()
    take: number = 20;
}