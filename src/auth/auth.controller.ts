import { Body, Controller, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MaxLengthPipe, MinLengthPipe, PasswordPipe } from './pipe/password.pipe';
import { BasicTokenGuard } from './guard/basic-token.guard';
import { AccessTokenGuard, RefreshTokenGuard } from './guard/bearer-token.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { IsPublic } from 'src/common/decorator/is-public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {

  }

  //* Bearer -> Access 토큰 재발급 
  @Post('token/access')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  postTokenAccess( @Headers('authorization') rawToken: string ){
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    // { accessToken: {token} }
    const newToken = this.authService.rotateToken(token, false);

    return {
      accessToken: newToken, 
    };
  }
  
  //* Bearer -> Refresh 토큰 재발급 
  @Post('token/refresh')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  postTokenRefresh( @Headers('authorization') rawToken: string ){
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    // { refreshToken: {token} }
    const newToken = this.authService.rotateToken(token, true);

    return {
      refreshToken: newToken, 
    };
  }

  @Post('login/email')
  @IsPublic()
  @UseGuards(BasicTokenGuard)
  postLoginEmail(
    // @Body('email') email: string, 
    // @Body('password') password: string, 
    @Headers( 'authorization' ) rawToken: string, 
    // @Request() req, 
  ){
    // email:password -> base64
    const token = this.authService.extractTokenFromHeader(rawToken, false); 

    const credentials = this.authService.decodeBasicToken(token); 
    //credentials -> { email: email, password: password }; 

    return this.authService.loginWithEmail( credentials );
  }

  @Post('register/email')
  @IsPublic()
  postRegisterEmail(
    // @Body('nickname') nickname: string,
    // @Body('email') email: string,
    // @Body('password', new MaxLengthPipe(8, '비밀번호'), new MinLengthPipe(4, '비밀번호')) password: string,
    @Body() body: RegisterUserDto
  ){
    return this.authService.registerWithEmail(
      // {
      //   nickname, 
      //   email, 
      //   password, 
      // }
      body,
    );
  }

}
