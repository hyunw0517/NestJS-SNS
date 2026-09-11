import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ChatsMessagesService } from "./messages.service";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";
import { ChatsService } from "src/chats/chats.service";
import { User } from "src/users/decorator/user.decorator";

@Controller('chats/:cid/messages')
export class MessagesController{
    constructor(
        private readonly messagesService: ChatsMessagesService,
        private readonly chatsService: ChatsService,
    ){}

    @Get()
    async paginatateMessage(
        @Param('cid', ParseIntPipe) id: number,
        @Query() dto: BasePaginationDto,
        @User('id') userId: number,
    ){
        // 타인 chat의 message history에 room id만으로 직접 접근하지 못하도록 확인하고
        // (404/403), 활성 membership의 joinedAt을 받아 그 이전 메시지는 애초에 조회
        // 대상에서 제외한다(초대/재초대 이전 메시지 비노출).
        const membership = await this.chatsService.assertUserIsActiveMember(id, userId);

        return this.messagesService.paginateMessagesForChat(dto, id, membership.joinedAt);
    }
}
