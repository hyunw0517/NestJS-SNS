import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolesEnum } from "../const/roles.const";
import { PostsModel } from "src/posts/entities/posts.entity";

@Entity()
export class UsersModel{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        // 1) 길이
        length: 20, 
        // 2) 유일값 
        unique: true,
    })
    // 1) 길이가 20을 넘지 않을 것 
    // 2) 유일값이 될 것 
    nickname: string;

    @Column({
        unique: true,
    })
    // 1) 유일값이 될 것
    email: string;

    @Column()
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

}