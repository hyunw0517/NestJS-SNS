import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PostsModel } from "../entities/posts.entity";
import { PickType } from "@nestjs/mapped-types";

// Pick, Omit, Partial -> Type 반환
// PickType, OmitType, PartialType -> 값을 반환

export class CreatePostDto extends PickType( PostsModel, ['title', 'content'] ) {
    
//   @IsString({
//     message: 'title은 string 타입을 입력해 줘야 합니다.'
//   })
//   @IsNotEmpty({
//     message: 'title 값을 입력해 줘야 합니다.'
//   })
//   title: string;

//   @IsString({
//     message: 'content은 string 타입을 입력해 줘야 합니다.'
//   })
//   /*@IsNotEmpty({
//     message: 'content 값을 입력해 줘야 합니다.'
//   })*/
//   content: string;

    @IsString({
        each: true, //리스트라는 뜻이며, string으로 검증
    })
    @IsOptional()
    images: string[] = [];

}