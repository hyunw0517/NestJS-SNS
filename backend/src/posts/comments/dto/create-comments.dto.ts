import { IsNumber, IsOptional } from "class-validator";
import { PickType } from "@nestjs/mapped-types";
import { CommentsModel } from "../entity/comments.entity";

export class CreateCommentsDto extends PickType(CommentsModel, [
    'comment',
]){
    // 대댓글 작성 시 부모 댓글 id. 생략하면 게시글에 직접 다는 최상위 댓글이다.
    @IsNumber()
    @IsOptional()
    parentId?: number;
}