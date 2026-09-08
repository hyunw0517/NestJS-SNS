import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { join } from "node:path";
import { POST_PUBLIC_IMAGE_PATH } from "src/common/const/path.const";
import { BaseModel } from "src/common/entity/base.entity";
import { ImageModel, ImageModelType } from "src/common/entity/image.entity";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { UsersModel } from "src/users/entity/users.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CommentsModel } from "../comments/entity/comments.entity";

@Entity()
export class PostsModel extends BaseModel {

    // 1) Foreign Key를 이용하여 UsersModel과 연동한다. 
    // 2) Not Null 
    @ManyToOne(() => UsersModel, (user) => user.posts, {
        nullable: false,
    })
    author: UsersModel;

    // X(Twitter) 스타일 SNS 구조에서는 content 중심이라 title은 선택 입력으로 완화
    @Column({
        nullable: true,
    })
    @IsString({
        message: stringValidationMessage
    })
    @IsOptional()
    title?: string;

    @Column()
    @IsString({
        message: stringValidationMessage
    })
    content: string;

    /*
    // 단일 이미지
    @Column({
        nullable: true, 
    })
    @Transform(({value})=> value && `/${join( POST_PUBLIC_IMAGE_PATH, value )}`)
    image?: string;
    */


    @Column()
    likeCount: number;

    @Column()
    commentCount: number;

    @OneToMany((type) => ImageModel, (image) => image.post)
    images: ImageModel[];

    @OneToMany((type) => CommentsModel, (comments) => comments.post)
    comments: CommentsModel[];

    // DB 컬럼이 아니다. 요청을 보낸 사용자가 이 게시글을 좋아요했는지를 서비스 레벨에서
    // 채워 넣는 값(PostsService.attachIsLiked)이라 @Column을 붙이지 않는다.
    isLiked?: boolean;

}
