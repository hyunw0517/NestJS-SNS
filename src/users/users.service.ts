import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UsersModel)
        private readonly usersRepository: Repository<UsersModel>, 
    ){}

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
}
