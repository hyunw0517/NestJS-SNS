import { BadRequestException, Injectable } from '@nestjs/common';
import { BasePaginationDto } from './dto/base-pagination.dto';
import { FindManyOptions, FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { BaseModel } from './entity/base.entity';
import { FILTER_MAPPER } from './const/filter-mapper.const';
import { HOST, PROTOCOL } from './const/env.const';
import { find } from 'rxjs';

@Injectable()
export class CommonService {
    paginate<T extends BaseModel>(
        dto: BasePaginationDto, 
        repository: Repository<T>, 
        overrideFindOptions: FindManyOptions<T> = {}, 
        path: string, 
    ){
        if( dto.page ){
            return this.pagePaginate(dto, repository, overrideFindOptions);
        }else{
            return this.cursorPaginate(dto, repository, overrideFindOptions, path);
        }
    }

    private async pagePaginate<T extends BaseModel>(
        dto: BasePaginationDto, 
        repository: Repository<T>, 
        overrideFindOptions: FindManyOptions<T> = {},
    ){
        const findOptions = this.composeFindOptions<T>(dto);

        const [data, count] = await repository.findAndCount({
            ...findOptions, 
            ...overrideFindOptions, 
        });

        return {
            data, 
            total: count,
        }
    }

    private async cursorPaginate<T extends BaseModel>(
        dto: BasePaginationDto, 
        repository: Repository<T>, 
        overrideFindOptions: FindManyOptions<T> = {}, 
        path: string, 
    ){
        /**
         * where__likeCount__more_than 같은 경우,
         * 
         * where__title_ilike 같은 경우,
         * 
         */
        const findOptions = this.composeFindOptions<T>(dto);

        const results = await repository.find({
            ...findOptions, 
            ...overrideFindOptions, 

        });

        const lastItem = results.length > 0 && results.length === dto.take ? results[results.length - 1] : null;
                
        const nextUrl = lastItem && new URL(`${PROTOCOL}://${HOST}/${path}`);

        if( nextUrl ){
            /**
             * dto의 키 값들을 루핑하면서
             * 키 값에 해당되는 value가 존재하면
             * param에 그대로 붙여넣는다. 
             * 
             * 단, where__id__more_than 값만 lastItem의 마지막 값으로 넣어준다. 
             */
            for( const key of Object.keys(dto) ){
                if( dto[key] ){
                    if( key !== 'where__id__more_than' && key !== 'where__id__less_than' ){
                        nextUrl.searchParams.append(key, dto[key].toString() );
                    }
                }
            }
            
            let key: any = null;

            if( dto.order__createdAt === 'ASC' ){
                key = 'where__id__more_than';
            }else{
                key = 'where__id__less_than';
            }

            nextUrl.searchParams.append( key, lastItem.id.toString() );
        }

        return {
            data: results,
            cursor: {
                after: lastItem?.id ?? null,
            },
            count: results.length,
            next: nextUrl?.toString() ?? null,
        }
    }

    private composeFindOptions<T extends BaseModel>(dto: BasePaginationDto) : FindManyOptions<T> {
        /**
         * where, order, take, skip -> page 기반
         * 
         * where__likeCount__more_than 혹은 where__title__ilike 등 추가 필터를 넣고 싶어 졌을 때 
         * 모든 where 필터들을 자동으로 파싱할 수 있도록 구현
         * 
         * 1) where로 시작한다면 필터 로직을 적용한다. 
         * 2) order로 시작한다면 정렬 로직을 적용한다. 
         * 3) 필터 로직을 적용한다면 '__' 기준으로 split 했을 때 3개의 값으로 나뉘는지, 2개의 값으로 나뉘는지 확인한다. 
         *      3-1) 3개의 값으로 나뉜다면 FILTER_MAPPER에서 해당하는 opretator를 찾아서 적용한다. 
         *          ['where', 'id', 'more_than']
         *      3-2) 2개의 값으로 나뉜다면 정확한 값을 필터링하는 것이기 때문에 operator 없이 적용한다.
         *          ['where', 'id']
         * 4) order의 경우 3-2와 동일하게 적용한다. 
         */

        let where: FindOptionsWhere<T> = {};
        let order: FindOptionsOrder<T> = {};

        for( const [key, value] of Object.entries(dto) ){
            if( value === undefined || value === null ) continue;

            if( key.startsWith('where__') ){
                where = {
                    ...where, 
                    ...this.parseWhereFilter(key, value),
                }
            }else if( key.startsWith('order__') ){
                order = {
                    ...order, 
                    ...this.parseWhereFilter(key, value),
                }
            }
        }

        return {
            where, 
            order, 
            take: dto.take, 
            skip: dto.page ? dto.take * (dto.page - 1) : undefined, 
        };

    }

    private parseWhereFilter<T extends BaseModel>(key: string, value: any) : FindOptionsWhere<T> | FindOptionsOrder<T> {
        const options: FindOptionsWhere<T> = {};

        const split = key.split('__');

        // 문자열 '__' 기준으로 split 했을 때 2개 혹은 3개로 나뉘어야 한다.
        if( split.length !== 2 && split.length !== 3 ){
            throw new BadRequestException(`Invalid filter key: ${key}`);
        }

        if( split.length === 2 ){
            // where__id
            // ['where', 'id']
            const [_, field] = split;

            options[field] = value; 
        }else{
            // where__id__more_than
            // ['where', 'id', 'more_than']
            /**
             * 길이가 3인 경우 Typeorm 유틸리티 적용이 필요한 경우이다. 
             * 
             * FILTER_MAPPER에 미리 정의해둔 값들로
             * field 값에 FILTER_MAPPER에서 해당되는 utility를 가져온 후 값에 적용한다. 
             */
            const [_, field, operator] = split;

            // where__id__between = 3,4
            // 만약 split 대상 문자가 존재하지 않으면 길이가 무조건 1이다. 
            // const values = value.toString().split(',');

            // if( operator === 'between' ){
            //     options[field] = FILTER_MAPPER[operator](values[0], values[1]);
            // }else{
            //     options[field] = FILTER_MAPPER[operator](value); 
            // }

            if( operator === 'i_like' ){
                options[field] = FILTER_MAPPER[operator](`%${value}%`);
            }else{
                options[field] = FILTER_MAPPER[operator](value);
            }
        }

        return options; 
    }

    //! parseWhereFilter에 부분적으로 중복되는 로직이 존재하기 때문에 사용하지 않음. 
    // private parseOrderFilter<T extends BaseModel>(key: string, value: any) : FindOptionsOrder<T> {
    //     const order: FindOptionsOrder<T> = {};

    //     /**
    //      * order는 무조건 2개로 나뉘어야 한다. 
    //      */
    //     const split = key.split('__');

    //     if( split.length !== 2 ){
    //         throw new BadRequestException(`Invalid order key: ${key}`);
    //     }

    //     const [_, field] = split;

    //     order[field] = value;

    //     return order;
    // }

}
