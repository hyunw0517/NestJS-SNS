import { BaseModel } from "src/common/entity/base.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { ChatsModel } from "./chats.entity";
import { ChatMemberRole } from "../const/chat-member-role.const";

// UsersModel<->ChatsModel의 자동 ManyToMany(@JoinTable) 대신 쓰는 명시적 참여자 테이블.
@Entity()
@Unique(['chat', 'user'])
export class ChatMembersModel extends BaseModel {
    @ManyToOne(() => ChatsModel, (chat) => chat.members, { onDelete: 'CASCADE' })
    chat: ChatsModel;

    @ManyToOne(() => UsersModel, (user) => user.chatMembers, { onDelete: 'CASCADE' })
    user: UsersModel;

    // BaseModel의 createdAt은 "이 참여자 row가 실제로 DB에 만들어진 시각"(감사 목적)이고,
    // joinedAt은 "이 사용자가 이 chat에 실제로 참여한 시각"이라는 도메인 의미를 갖는다.
    // 지금은 항상 같은 값이지만(생성 즉시 참여), 이후 그룹 초대가 생기면 두 값이 달라질
    // 수 있어 미리 분리해둔다.
    @Column()
    joinedAt: Date;

    // 기존 DIRECT 데이터는 synchronize가 컬럼을 추가할 때 이 default(MEMBER)로
    // 채워진다 - DIRECT에는 OWNER 개념이 없으므로 둘 다 MEMBER인 채로 둬도 무방하다.
    @Column({
        enum: Object.values(ChatMemberRole),
        default: ChatMemberRole.MEMBER,
    })
    role: ChatMemberRole;

    // null이면 현재 참여 중. 이번 단계에는 퇴장 기능이 없어 항상 null이지만,
    // assertUserIsMember/조회 로직이 "활성 참여자"를 걸러낼 수 있도록 미리 추가해둔다.
    // TS 유니언 타입(Date | null)은 reflect-metadata가 design:type을 Object로 넘겨
    // TypeORM이 컬럼 타입을 추론하지 못하므로(다른 nullable 컬럼들과 동일하게) 단일
    // 타입으로 선언하고 type을 명시한다.
    @Column({
        type: 'timestamp',
        nullable: true,
    })
    leftAt?: Date;
}
