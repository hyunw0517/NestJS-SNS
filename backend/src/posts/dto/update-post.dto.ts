import { PartialType, PickType } from "@nestjs/mapped-types";
import { PostsModel } from "../entity/posts.entity";
import { CreatePostDto } from "./create-post.dto";
import { IsOptional, IsString } from "class-validator";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";

//export class UpdatePostDto extends PickType( PostsModel, ['title', 'content'] ) {
export class UpdatePostDto extends PartialType(CreatePostDto) {
    @IsString({
        message: stringValidationMessage
    })
    @IsOptional()
    title?: string;

    @IsString({
        message: stringValidationMessage
    })
    @IsOptional()
    content?: string;

    // CreatePostDto의 images는 `= []` 기본값이 있어서, PartialType으로 상속만 받으면
    // 요청에 images를 아예 안 보내도 인스턴스 생성 시 기본값 []가 채워진다.
    // 컨트롤러의 `if(body.images)`는 빈 배열도 truthy라 그대로 통과해버려서,
    // images를 안 보낸 "텍스트만 수정" 요청에도 기존 이미지가 전부 삭제되는 버그가 있었다.
    // 여기서 기본값 없이 다시 선언해 안 보내면 undefined가 되도록 한다.
    @IsString({
        each: true,
    })
    @IsOptional()
    images?: string[];
}
