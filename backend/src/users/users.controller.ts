import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesEnum } from './const/roles.const';
import { Roles } from './decorator/roles.decorator';
import { UsersModel } from './entity/users.entity';
import { User } from './decorator/user.decorator';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import type { QueryRunner as QR } from 'typeorm';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { PatchUserDto } from './dto/patch-user.dto';
import { BasePaginationDto } from 'src/common/dto/base-pagination.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {
    
  }

  //! 회원가입은 auth.module(POST /auth/register/email)로 대체되어 여기엔 없다.

  //* GET /users/me -> 현재 로그인한 사용자 조회
  @Get('me')
  getMe(@User() user: UsersModel) {
    return user;
  }

  //* PATCH /users/me -> Edit Profile 저장(nickname/handle/bio/profileImage/coverImage)
  @Patch('me')
  @UseInterceptors(TransactionInterceptor)
  patchMe(
    @User('id') userId: number,
    @Body() body: PatchUserDto,
    @QueryRunner() qr: QR,
  ) {
    return this.usersService.updateUser(userId, body, qr);
  }

  //* GET /users -> User 조회(관리자 전용, 현재 이를 호출하는 관리자 화면은 없다)
  @Get()
  @Roles(RolesEnum.ADMIN)
  getUsers() {
    return this.usersService.getAllUsers();
  }

  //* GET /users/search?q=... -> 그룹 채팅 생성/초대 대상 선택용 최소 사용자 검색.
  // 'follow'/'me'와 마찬가지로 리터럴 세그먼트라 아래 GET /:id보다 먼저 와야 한다.
  // 인증 필요(로그인 사용자 목록 노출을 막고, 본인은 결과에서 제외해야 하므로).
  @Get('search')
  searchUsers(
    @User('id') userId: number,
    @Query('q') q?: string,
  ){
    return this.usersService.searchUsers(userId, q);
  }

  @Post('follow/:id')
  @UseInterceptors(TransactionInterceptor)
  async postFollow(
    @User() user: UsersModel,
    @Param('id', ParseIntPipe) followeeId: number,
    @QueryRunner() qr: QR,
  ){
     await this.usersService.followUser(user.id, followeeId, qr);

     // confirm 단계 없이 즉시 확정되므로(followUser 참고), 카운트도 여기서 바로 반영한다.
     await this.usersService.incrementFollowerCount(followeeId, qr);
     await this.usersService.incrementFolloweeCount(user.id, qr);

     return true;
  }

  @Delete('follow/:id')
  @UseInterceptors(TransactionInterceptor)
  async deleteFollow(
    @User() user: UsersModel,
    @Param('id', ParseIntPipe) followeeId: number,
    @QueryRunner() qr: QR,
  ){
    const wasConfirmed = await this.usersService.deleteFollow(user.id, followeeId, qr);

    if(wasConfirmed){
      await this.usersService.decrementFollowerCount(followeeId, qr);
      await this.usersService.decrementFolloweeCount(user.id, qr);
    }

    return true;
  }

  //* GET /users/:id/followers -> :id를 팔로우하는 사람들(확정된 관계만) 목록, cursor pagination.
  // 세그먼트가 2개(:id/followers)라 아래 GET /users/:id(세그먼트 1개)와 겹치지 않는다.
  @Get(':id/followers')
  @IsPublic()
  getFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: BasePaginationDto,
    @Request() req,
  ) {
    return this.usersService.paginateFollowers(query, id, req.user?.id);
  }

  //* GET /users/:id/following -> :id가 팔로우하는 사람들(확정된 관계만) 목록, cursor pagination.
  @Get(':id/following')
  @IsPublic()
  getFollowing(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: BasePaginationDto,
    @Request() req,
  ) {
    return this.usersService.paginateFollowing(query, id, req.user?.id);
  }

  //* GET /users/:id -> Profile 화면용 공개 사용자 조회.
  // 'me', 'follow/*' 같은 리터럴 라우트와 겹치지 않도록 컨트롤러 맨 아래(가장 나중)에 둔다.
  // 공개 라우트지만, 게시글/댓글 좋아요와 동일하게 BearerTokenGuard가 로그인 상태면
  // req.user를 채워줘서 isFollowing까지 함께 내려줄 수 있다.
  @Get(':id')
  @IsPublic()
  getUserProfile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ){
    return this.usersService.getUserProfileById(id, req.user?.id);
  }
}
