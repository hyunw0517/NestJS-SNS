import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { join } from "node:path";
import { POST_PUBLIC_IMAGE_PATH } from "src/common/const/path.const";
import { BaseModel } from "src/common/entity/base.entity";
import { ImageModel, ImageModelType } from "src/common/entity/image.entity";
import { notEmptyValidationMessage } from "src/common/validation-message/not-empty-validation.message";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { UsersModel } from "src/users/entities/users.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class PostsModel extends BaseModel {

    // 1) Foreign Key를 이용하여 UsersModel과 연동한다. 
    // 2) Not Null 
    @ManyToOne(() => UsersModel, (user) => user.posts, {
        nullable: false,
    })
    author: UsersModel;

    @Column()
    @IsString({
        message: stringValidationMessage
    })
    @IsNotEmpty({
        message: notEmptyValidationMessage 
    })
    title: string;

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

}
