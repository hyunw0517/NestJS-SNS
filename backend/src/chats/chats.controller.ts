import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseInterceptors } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { User } from 'src/users/decorator/user.decorator';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import type { QueryRunner as QR } from 'typeorm';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { InviteChatMembersDto } from './dto/invite-chat-members.dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  //* GET /chats -> 로그인 사용자가 참여한 chat(DIRECT+GROUP) 목록만 반환(전체 조회 아님).
  @Get()
  getMyChats(
    @User('id') userId: number,
  ){
    return this.chatsService.getUserChats(userId);
  }

  //* POST /chats/direct/:userId -> userId와의 1:1 DM 방을 가져오거나 새로 만든다.
  @Post('direct/:userId')
  getOrCreateDirectChat(
    @User('id') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ){
    return this.chatsService.findOrCreateDirectChat(userId, targetUserId);
  }

  //* POST /chats/group -> 그룹 채팅방 생성(생성자 OWNER, 나머지 MEMBER).
  // chat row 생성 + memberships 생성이 하나의 트랜잭션으로 처리되어야 하므로
  // TransactionInterceptor를 쓴다(중간에 실패하면 chat만 만들어지고 마는 상황 방지).
  @Post('group')
  @UseInterceptors(TransactionInterceptor)
  createGroupChat(
    @User('id') userId: number,
    @Body() body: CreateGroupChatDto,
    @QueryRunner() qr: QR,
  ){
    return this.chatsService.createGroupChat(userId, body, qr);
  }

  //* GET /chats/:chatId/members -> GROUP의 활성 멤버 목록(email 등 민감정보 없음).
  @Get(':chatId/members')
  getChatMembers(
    @Param('chatId', ParseIntPipe) chatId: number,
    @User('id') userId: number,
  ){
    return this.chatsService.getChatMembers(chatId, userId);
  }

  //* POST /chats/:chatId/members -> OWNER가 GROUP에 사용자를 초대(여러 명 동시 가능).
  // 신규/재초대 판단 + 여러 membership 생성·재활성화가 하나의 트랜잭션으로 처리된다.
  @Post(':chatId/members')
  @UseInterceptors(TransactionInterceptor)
  inviteMembers(
    @Param('chatId', ParseIntPipe) chatId: number,
    @User('id') userId: number,
    @Body() body: InviteChatMembersDto,
    @QueryRunner() qr: QR,
  ){
    return this.chatsService.inviteMembers(chatId, userId, body.userIds, qr);
  }

  //* DELETE /chats/:chatId/members/me -> 자진 퇴장(GROUP만). OWNER가 나가면 같은
  // 트랜잭션에서 다음 OWNER를 자동 선정한다.
  @Delete(':chatId/members/me')
  @UseInterceptors(TransactionInterceptor)
  async leaveChat(
    @Param('chatId', ParseIntPipe) chatId: number,
    @User('id') userId: number,
    @QueryRunner() qr: QR,
  ){
    await this.chatsService.leaveChat(chatId, userId, qr);

    return true;
  }
}
