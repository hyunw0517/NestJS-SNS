import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';
import { UserFollowsModel } from './entity/user-followers.entity';
import { QueryRunner } from 'typeorm';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UsersModel)
        private readonly usersRepository: Repository<UsersModel>, 
        @InjectRepository(UserFollowsModel)
        private readonly userFollowsRepository: Repository<UserFollowsModel>, 
    ){}

    getUsersRepotiroy(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<UsersModel>(UsersModel) : this.usersRepository;
    }

    getUserFollowRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<UserFollowsModel>(UserFollowsModel) : this.userFollowsRepository;
    }

    //async createUser( nickname: string, email: string, password: string ){
    async createUser( user: Pick<UsersModel, 'nickname' | 'email' | 'password'> ){
        // nickname은 표시 이름(display name)이므로 중복을 허용하며 별도 검사를 하지 않는다.
        // exist() -> 만약 조건에 해당하는 값이 있으면 true 반환
        const emailExists = await this.usersRepository.exists({
            where:{
                email: user.email,
            }
        });
        
        if( emailExists ){
            throw new BadRequestException('이미 존재하는 이메일입니다.');
        }

        const userObject = this.usersRepository.create({
            nickname: user.nickname,
            email: user.email,
            password: user.password,
        });

        const newUser = await this.usersRepository.save(userObject);

        return newUser;
    }

    async getAllUsers(){
        return this.usersRepository.find();
    }

    async getUserByEmail(email: string){
        return this.usersRepository.findOne({
            where: {
                email,
            },
        });
    }

    // Profile 화면용 공개 조회. email 등 민감 필드를 노출하지 않도록 엔티티를 그대로
    // 반환하지 않고 필요한 필드만 골라 응답하며, isFollowing은 요청자 기준으로 계산한다
    // (PostsService.attachIsLiked와 동일한 이유로 requestUserId가 없으면 항상 false).
    async getUserProfileById(id: number, requestUserId?: number){
        const user = await this.usersRepository.findOne({
            where: { id },
        });

        if( !user ){
            throw new NotFoundException(`id: ${id} User는 존재하지 않습니다.`);
        }

        let isFollowing = false;

        if( requestUserId ){
            isFollowing = await this.userFollowsRepository.exists({
                where: {
                    follower: { id: requestUserId },
                    followee: { id },
                },
            });
        }

        return {
            id: user.id,
            nickname: user.nickname,
            handle: user.handle,
            profileImage: user.profileImage,
            coverImage: user.coverImage,
            bio: user.bio,
            followerCount: user.followerCount,
            followeeCount: user.followeeCount,
            createdAt: user.createdAt,
            isFollowing,
        };
    }

    async getFollowers(userId: number, includeNotConfirmed: boolean) {

        const where = {
            followee: {
                id: userId,
            },
        }

        if( !includeNotConfirmed ){
            where['isConfirmed'] = true;
        }

        const result = await this.userFollowsRepository.find({
            where: where,
            relations:{
                follower: true,
                followee: true, 
            },
        });

        if(!result){
            throw new BadRequestException(`id: ${userId} User는 존재하지 않습니다.`);
        }

        return result.map((x) => ({
            id: x.follower.id, 
            nickname: x.follower.nickname,
            email: x.follower.email,
            isConfirmed: x.isConfirmed,
        }));
    }

    async followUser(followerId: number, followeeId: number, qr?: QueryRunner){
        if( followerId === followeeId ){
            throw new BadRequestException('자기 자신을 팔로우할 수 없습니다.');
        }

        const userFollowsRepository = this.getUserFollowRepository(qr);

        // followeeId가 존재하지 않으면 save()가 FK 제약 위반으로 500을 던지므로,
        // PostsService.likePost와 동일한 패턴으로 미리 확인해서 404로 응답한다.
        const followeeExists = await this.usersRepository.exists({
            where: { id: followeeId },
        });

        if( !followeeExists ){
            throw new NotFoundException(`id: ${followeeId} User는 존재하지 않습니다.`);
        }

        const existing = await userFollowsRepository.findOne({
            where:{
                follower: {
                    id: followerId,
                },
                followee: {
                    id: followeeId,
                },
            },
        });

        if(existing){
            throw new BadRequestException('이미 팔로우한 유저입니다.');
        }

        await userFollowsRepository.save({
            follower: {
                id: followerId,
            },
            followee: {
                id: followeeId,
            },
            // 원래는 followee가 확인(confirm)해야 카운트가 반영되는 "팔로우 요청" 구조였지만,
            // 요청/알림 UI가 없어 confirm을 호출할 방법이 없다. Twitter 스타일로 즉시
            // 확정해 팔로우 즉시 카운트에 반영되도록 한다.
            isConfirmed: true,
        });

        return true;
    }

    async confirmFollow(followerId: number, followeeId: number, qr?: QueryRunner){
        const userFollowsRepository = this.getUserFollowRepository(qr); 
        
        const existing = await userFollowsRepository.findOne({
            where:{
                follower: {
                    id: followerId,
                },
                followee: {
                    id: followeeId,
                }
            },
            relations:{
                follower: true,
                followee: true, 
            },
        });
        
        if(!existing){
            throw new BadRequestException('존재하지 않는 팔로우 요청입니다.'); 
        }

        await userFollowsRepository.save({
            ...existing,
            isConfirmed: true, 
        });

        return true;
    }

    async deleteFollow(
        followerId: number,
        followeeId: number,
        qr?: QueryRunner,
    ){
        const userFollowsRepository = this.getUserFollowRepository(qr);

        const existing = await userFollowsRepository.findOne({
            where:{
                follower:{
                    id: followerId,
                },
                followee:{
                    id: followeeId,
                }
            },
        });

        // 좋아요 취소(unlikePost)와 동일하게, 팔로우하지 않은 상대를 언팔로우하려는
        // 시도는 조용히 성공 처리하지 않고 400으로 안내한다.
        if( !existing ){
            throw new BadRequestException('팔로우하지 않은 사용자입니다.');
        }

        await userFollowsRepository.delete({
            follower:{
                id: followerId,
            },
            followee:{
                id: followeeId,
            }
        })

        return existing.isConfirmed;
    }

    async incrementFollowerCount(userId: number, qr?: QueryRunner){
        const userRepository = await this.getUsersRepotiroy(qr);

        await userRepository.increment({
            id: userId,
        }, 'followerCount', 1);
    }

    async decrementFollowerCount(userId: number, qr?: QueryRunner){
        const userRepository = await this.getUsersRepotiroy(qr);

        await userRepository.decrement({
            id: userId,
        }, 'followerCount', 1);
    }

    async incrementFolloweeCount(userId: number, qr?: QueryRunner){
        const userRepository = await this.getUsersRepotiroy(qr);

        await userRepository.increment({
            id: userId,
        }, 'followeeCount', 1);
    }

    async decrementFolloweeCount(userId: number, qr?: QueryRunner){
        const userRepository = await this.getUsersRepotiroy(qr);

        await userRepository.decrement({
            id: userId,
        }, 'followeeCount', 1);
    }
}
