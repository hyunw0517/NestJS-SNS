import { BadRequestException, Injectable } from '@nestjs/common';
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
        // 1) nickname 중복 여부 확인 
        // exist() -> 만약 조건에 해당하는 값이 있으면 true 반환
        const nicknameExists = await this.usersRepository.exists({
            where:{
                nickname: user.nickname, 
            }
        });

        if( nicknameExists ){
            throw new BadRequestException('이미 존재하는 닉네임입니다.');
        }

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
        const userFollowsRepository = this.getUserFollowRepository(qr);

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

        await userFollowsRepository.delete({
            follower:{
                id: followerId,
            },
            followee:{
                id: followeeId,
            }
        })

        return existing?.isConfirmed ?? false;
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
