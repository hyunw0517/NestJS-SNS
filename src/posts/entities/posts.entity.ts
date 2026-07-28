import { IsNotEmpty, IsString } from "class-validator";
import { BaseModel } from "src/common/entity/base.entity";
import { notEmptyValidationMessage } from "src/common/validation-message/not-empty-validation.message";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { UsersModel } from "src/users/entities/users.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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

    @Column()
    likeCount: number;

    @Column()
    commentCount: number;

}
