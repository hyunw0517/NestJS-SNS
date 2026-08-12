import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { ChatsModel } from 'src/chats/entity/chats.entity';
import { UserFollowsModel } from './entity/user-followers.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([
      UsersModel,
      UserFollowsModel,
    ])
  ],
  //auth 모듈에서 가져가 사용할 수 있도록 export
  exports:[
    UsersService,
  ], 
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
