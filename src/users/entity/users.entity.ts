import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { RolesEnum } from "../const/roles.const";
import { PostsModel } from "src/posts/entity/posts.entity";
import { BaseModel } from "src/common/entity/base.entity";
import { IsEmail, IsNotEmpty, IsString, Length, ValidationArguments } from "class-validator";
import { lengthValidationMessage } from "src/common/validation-message/length-validation.message";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { emailValidationMessage } from "src/common/validation-message/email-validation.message";
import { Exclude, Expose } from "class-transformer";
import { ChatsModel } from "src/chats/entity/chats.entity";
import { MessagesModel } from "src/chats/messages/entity/messages.entity";
import { CommentsModel } from "src/posts/comments/entity/comments.entity";

/**
 * id: number 
 * nickname: string 
 * email: string
 * password: string
 * role: [RolesEnum.USER, RolesEnum.ADMIN]
 * 
 */

@Entity()
//@Exclude() // RestAPi에서 전체 노출 숨김 -> Expose() 사용한 것만 노출
export class UsersModel extends BaseModel{

    @Column({
        // 1) 길이
        length: 20, 
        // 2) 유일값 
        unique: true,
    })
    @IsString()
    @Length( 1, 20, {
        message: lengthValidationMessage,
    } )
    // 1) 길이가 20을 넘지 않을 것 
    // 2) 유일값이 될 것 
    //@Expose()
    nickname: string;

    // Expose -> 실제 존재하지 않는 프로퍼티를 표시
    // @Expose()
    // get nicknameAndEmail(){
    //     return this.nickname + '/' + this.email;
    // }

    @Column({
        unique: true, 
    })
    @IsString({
        message: stringValidationMessage
    })
    @IsEmail( {}, {
        message: emailValidationMessage
    })
    // 1) 유일값이 될 것
    //@Expose()
    email: string;

    @Column()
    @IsString({
        message: stringValidationMessage
    })
    @Length( 3, 8, {
        message: lengthValidationMessage,
    } )
    /** 
     * Exclude -> controller에서 @UseInterceptors(ClassSerializerInterceptor) 사용 시 숨김. 
     * 
     * Request
     * frontend -> backend
     * plain object (JSON) -> class instance (DTO)
     * 
     * Response
     * backend -> frontend
     * class instance (DTO) -> plain object (JSON)
     * 
     * toClassOnly -> class instancce로 변환될 때만
     * toPlainOnly -> plain object로 변환될 때만
     */ 
    @Exclude({
        toPlainOnly: true, 
    }) 
    password: string; 
    
    @Column({
        /*type: 'enum',
        enum: RolesEnum,
        default: RolesEnum.USER,*/
        enum: Object.values(RolesEnum), 
        default: RolesEnum.USER, 
    })
    role: RolesEnum;

    @OneToMany( () => PostsModel, (post) => post.author )
    posts: PostsModel[];

    @ManyToMany(() => ChatsModel, (chat) => chat.users )
    @JoinTable() 
    chats: ChatsModel[];

    @OneToMany( () => MessagesModel, (message) => message.author )
    messages: MessagesModel[];

    @OneToMany( () => CommentsModel, (comment) => comment.author )
    postComments: CommentsModel[];
}