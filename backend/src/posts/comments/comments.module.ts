import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { UserCommentsController } from './user-comments.controller';
import { CommentsModel } from './entity/comments.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { PostExistsMiddleware } from './middleware/post-exists.middleware';
import { PostsModule } from '../posts.module';
import { CommentLikeModel } from './entity/comment-likes.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommentsModel,
      CommentLikeModel,
    ]),
    CommonModule,
    AuthModule,
    UsersModule,
    PostsModule,
  ],
  controllers: [CommentsController, UserCommentsController],
  providers: [CommentsService],
})
export class CommentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer){
    consumer
    .apply(PostExistsMiddleware)
    .forRoutes(CommentsController);
  }
}
