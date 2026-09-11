import { BaseModel } from "src/common/entity/base.entity";
import { Column, Entity, OneToMany } from "typeorm";
import { IsOptional, IsString, Length } from "class-validator";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { lengthValidationMessage } from "src/common/validation-message/length-validation.message";
import { MessagesModel } from "../messages/entity/messages.entity";
import { ChatMembersModel } from "./chat-members.entity";
import { ChatType } from "../const/chat-type.const";

@Entity()
export class ChatsModel extends BaseModel {
    // 기존 1:1 DM 데이터는 synchronize가 컬럼을 추가할 때 이 default(DIRECT)로
    // 채워지므로 별도 backfill 스크립트 없이 안전하다.
    @Column({
        enum: Object.values(ChatType),
        default: ChatType.DIRECT,
    })
    type: ChatType;

    // DIRECT는 이름이 없다(상대방 정보로 표시). GROUP은 필수이며, 그 검증은
    // CreateGroupChatDto에서 한다(컬럼 자체는 두 타입이 공유하므로 nullable로 둔다).
    @Column({
        nullable: true,
    })
    @IsString({
        message: stringValidationMessage,
    })
    @Length(1, 50, {
        message: lengthValidationMessage,
    })
    @IsOptional()
    name?: string;

    @OneToMany(() => ChatMembersModel, (member) => member.chat)
    members: ChatMembersModel[];

    @OneToMany(() => MessagesModel, (message) => message.chat)
    messages: MessagesModel[];
}
