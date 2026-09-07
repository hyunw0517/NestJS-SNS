import { Body, ClassSerializerInterceptor, Controller, DefaultValuePipe, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesEnum } from './const/roles.const';
import { Roles } from './decorator/roles.decorator';
import { UsersModel } from './entity/users.entity';
import { User } from './decorator/user.decorator';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import type { QueryRunner as QR } from 'typeorm';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {
    
  }

  // //* Post /users -> User 추가
  // @Post()
  // postUser(
  //   @Body('nickname') nickname: string,
  //   @Body('email') email: string,
  //   @Body('password') password: string
  // ) {
  //   return this.usersService.createUser({
  //     nickname: nickname,
  //     email: email,
  //     password: password,
  //   });
  // }
  //! 회원가입 기능을 auth.module로 대체

  //* GET /users -> User 조회
  @Get()
  @Roles(RolesEnum.ADMIN)
  //@UseInterceptors(ClassSerializerInterceptor)
  /**
   * serialization -> 직렬화 -> class의 object에서 JSON 포맷으로 변환
   * deserialization -> 역직렬화
   */
  getUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('follow/me')
  async getFollow(
    @User() user: UsersModel,
    @Query('includeNotConfirmed', new DefaultValuePipe(false), ParseBoolPipe) includeNotConfirmed: boolean
  ){
    return this.usersService.getFollowers(user.id, includeNotConfirmed);
  }

  @Post('follow/:id')
  @UseInterceptors(TransactionInterceptor)
  async postFollow(
    @User() user: UsersModel,
    @Param('id', ParseIntPipe) followeeId: number,
    @QueryRunner() qr: QR, 
  ){
     await this.usersService.followUser(user.id, followeeId, qr);

     return true;
  }

  @Patch('follow/:id/confirm')
  @UseInterceptors(TransactionInterceptor)
  async patchFollowConfirm(
    @User() user: UsersModel, 
    @Param('id', ParseIntPipe) followerId: number,
    @QueryRunner() qr: QR, 
  ){
    await this.usersService.confirmFollow(followerId, user.id, qr);

    await this.usersService.incrementFollowerCount(user.id, qr);
    await this.usersService.incrementFolloweeCount(followerId, qr);

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
}
