import { Body, ClassSerializerInterceptor, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';

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
  //@UseInterceptors(ClassSerializerInterceptor)
  /**
   * serialization -> 직렬화 -> class의 object에서 JSON 포맷으로 변환
   * deserialization -> 역직렬화
   */
  getUsers() {
    return this.usersService.getAllUsers();
  }
}
