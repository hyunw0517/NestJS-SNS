import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { FindOperator, FindOptionsWhere, ILike, In, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { UserFollowsModel } from './entity/user-followers.entity';
import { QueryRunner } from 'typeorm';
import { basename, join, posix } from 'path';
import { promises } from 'fs';
import { TEMP_FOLDER_PATH, USERS_IMAGE_PATH, USERS_PUBLIC_IMAGE_PATH } from 'src/common/const/path.const';
import { PatchUserDto } from './dto/patch-user.dto';
import { BasePaginationDto } from 'src/common/dto/base-pagination.dto';

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

    // 그룹 채팅 생성/초대 대상 선택용 최소 검색. q가 없으면(최초 진입 시) 고를 수 있게
    // id 오름차순으로 일부만 보여주고, q가 있으면 nickname/handle에 대해 대소문자
    // 구분 없이 부분일치 검색한다. 요청자 본인은 항상 제외(자기 자신을 초대 대상으로
    // 고를 수 없어야 하므로). email/password 등 민감 필드는 내려주지 않는다.
    async searchUsers(requesterId: number, q?: string){
        const trimmed = q?.trim() ?? '';

        const where: FindOptionsWhere<UsersModel> | FindOptionsWhere<UsersModel>[] = trimmed
            ? [
                { nickname: ILike(`%${trimmed}%`), id: Not(requesterId) },
                { handle: ILike(`%${trimmed}%`), id: Not(requesterId) },
            ]
            : { id: Not(requesterId) };

        const users = await this.usersRepository.find({
            where,
            order: { id: 'ASC' },
            take: 20,
        });

        return users.map((user) => ({
            id: user.id,
            nickname: user.nickname,
            handle: user.handle,
            profileImage: user.profileImage,
        }));
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

    // 빈 문자열/공백만 있는 문자열은 "값 제거"로 취급해 null로 정규화한다(handle/bio 공통).
    private normalizeOptionalText(value: string | null): string | null {
        if( value === null ){
            return null;
        }

        const trimmed = value.trim();

        return trimmed.length === 0 ? null : trimmed;
    }

    // temp 폴더에 업로드된 파일을 public/users로 옮기고, 저장할 URL path를 반환한다.
    // PostsImagesService.createPostImage와 동일한 패턴(temp -> 실제 폴더 rename).
    private async moveTempImageToUsersFolder(fileName: string): Promise<string> {
        const tempFilePath = join(TEMP_FOLDER_PATH, fileName);

        try{
            await promises.access(tempFilePath);
        }catch{
            throw new BadRequestException('존재하지 않는 파일입니다.');
        }

        const newFileName = basename(tempFilePath);
        const newPath = join(USERS_IMAGE_PATH, newFileName);

        await promises.rename(tempFilePath, newPath);

        return `/${posix.join(USERS_PUBLIC_IMAGE_PATH, newFileName)}`;
    }

    private async deleteUsersImageFile(storedPath: string) {
        const filePath = join(USERS_IMAGE_PATH, basename(storedPath));

        try{
            await promises.unlink(filePath);
        }catch{
            // 파일이 이미 존재하지 않는 경우 무시(posts 쪽과 동일한 관례)
        }
    }

    // profileImage/coverImage 컬럼 하나의 다음 상태를 계산한다. 호출부에서 이미
    // dto의 값이 undefined가 아님을 확인한 뒤에만 부르므로(=필드를 건드리기로 확정된 경우만),
    // 여기서는 null(제거)과 string(교체) 두 가지만 다룬다.
    // null: 기존 이미지 제거 / string: temp의 새 파일로 교체(기존 파일은 정리)
    private async resolveImageColumnUpdate(
        currentValue: string | null | undefined,
        newValue: string | null,
    ): Promise<string | null> {
        if( newValue === null ){
            if( currentValue ){
                await this.deleteUsersImageFile(currentValue);
            }

            return null;
        }

        const movedPath = await this.moveTempImageToUsersFolder(newValue);

        if( currentValue ){
            await this.deleteUsersImageFile(currentValue);
        }

        return movedPath;
    }

    // Edit Profile 저장. dto에 존재하지 않는(undefined) 필드는 건드리지 않고,
    // 존재하는 필드만 갱신한다(부분 수정 계약 — PostsService.updatePost와 동일한 방식).
    async updateUser(userId: number, dto: PatchUserDto, qr?: QueryRunner){
        const repository = this.getUsersRepotiroy(qr);

        const user = await repository.findOne({
            where: { id: userId },
        });

        if( !user ){
            throw new NotFoundException(`id: ${userId} User는 존재하지 않습니다.`);
        }

        const updatePayload: {
            nickname?: string;
            handle?: string | null;
            bio?: string | null;
            profileImage?: string | null;
            coverImage?: string | null;
        } = {};

        if( dto.nickname !== undefined ){
            updatePayload.nickname = dto.nickname;
        }

        if( dto.handle !== undefined ){
            const normalizedHandle = this.normalizeOptionalText(dto.handle);

            if( normalizedHandle ){
                const handleTaken = await repository.exists({
                    where: {
                        handle: normalizedHandle,
                        id: Not(userId),
                    },
                });

                if( handleTaken ){
                    throw new BadRequestException('이미 사용 중인 handle입니다.');
                }
            }

            updatePayload.handle = normalizedHandle;
        }

        if( dto.bio !== undefined ){
            updatePayload.bio = this.normalizeOptionalText(dto.bio);
        }

        if( dto.profileImage !== undefined ){
            updatePayload.profileImage = await this.resolveImageColumnUpdate(user.profileImage, dto.profileImage);
        }

        if( dto.coverImage !== undefined ){
            updatePayload.coverImage = await this.resolveImageColumnUpdate(user.coverImage, dto.coverImage);
        }

        // handle/bio/profileImage/coverImage 컬럼은 DB상 nullable이지만 엔티티 타입은
        // `string | undefined`로 선언돼 있어(null 미반영), null을 명시적으로 저장하려는
        // 이 경우에만 cast가 필요하다. 런타임에는 TypeORM이 null을 그대로 컬럼에 반영한다.
        await repository.save({
            ...user,
            ...updatePayload,
        } as UsersModel);

        return repository.findOne({
            where: { id: userId },
        });
    }

    // handle 중복확인 등과 별개로, Profile Followers/Following 다이얼로그 목록 조회용.
    // email 등 민감 필드를 빼고 최소한의 필드 + 요청자 기준 isFollowing만 내려준다.
    private toPublicFollowUser(user: UsersModel, isFollowing: boolean) {
        return {
            id: user.id,
            nickname: user.nickname,
            handle: user.handle,
            profileImage: user.profileImage,
            bio: user.bio,
            followerCount: user.followerCount,
            followeeCount: user.followeeCount,
            isFollowing,
        };
    }

    // requestUserId가 로그인 상태가 아니면(비로그인) 전부 false로 채운다
    // (PostsService.attachIsLiked와 동일한 이유).
    private async attachIsFollowing(users: UsersModel[], requestUserId?: number) {
        if( !requestUserId || users.length === 0 ){
            return users.map((user) => this.toPublicFollowUser(user, false));
        }

        const follows = await this.userFollowsRepository.find({
            where: {
                follower: { id: requestUserId },
                followee: { id: In(users.map((user) => user.id)) },
                isConfirmed: true,
            },
            relations: { followee: true },
        });

        const followingIds = new Set(follows.map((follow) => follow.followee.id));

        return users.map((user) => this.toPublicFollowUser(user, followingIds.has(user.id)));
    }

    private async assertUserExists(userId: number) {
        const exists = await this.usersRepository.exists({ where: { id: userId } });

        if( !exists ){
            throw new NotFoundException(`id: ${userId} User는 존재하지 않습니다.`);
        }
    }

    // Followers/Following 목록 둘 다 같은 모양의 cursor pagination이 필요하지만, 대상은
    // UserFollowsModel(follower/followee 관계 row)이라 CommonService.paginate가 기대하는
    // "단일 엔티티를 그대로 페이지네이션"과는 다르게 조인된 상대방 user로 매핑해야 한다.
    // CommonService.paginate를 그대로 쓰려면 UsersModule <-> CommonModule 순환 의존성이
    // 생겨(CommonModule이 이미 UsersModule을 참조) forwardRef가 필요해지므로, 그 정도
    // 배선 비용 없이 동일한 cursor 계약(`{data, cursor: {after}, count}`)만 직접 구현한다.
    // Frontend의 infinite query hook들은 `cursor.after`만 사용하므로 이 정도로 충분하다.
    private buildFollowCursorWhere(
        base: FindOptionsWhere<UserFollowsModel>,
        dto: BasePaginationDto,
    ): FindOptionsWhere<UserFollowsModel> {
        let cursorIdCondition: FindOperator<number> | undefined;

        if( dto.where__id__more_than ){
            cursorIdCondition = MoreThan(dto.where__id__more_than);
        }else if( dto.where__id__less_than ){
            cursorIdCondition = LessThan(dto.where__id__less_than);
        }

        return {
            ...base,
            isConfirmed: true,
            ...(cursorIdCondition ? { id: cursorIdCondition } : {}),
        };
    }

    async paginateFollowers(dto: BasePaginationDto, targetUserId: number, requestUserId?: number){
        await this.assertUserExists(targetUserId);

        const rows = await this.userFollowsRepository.find({
            where: this.buildFollowCursorWhere({ followee: { id: targetUserId } }, dto),
            relations: { follower: true },
            order: { createdAt: dto.order__createdAt },
            take: dto.take,
        });

        const data = await this.attachIsFollowing(rows.map((row) => row.follower), requestUserId);
        const lastRow = rows.length > 0 && rows.length === dto.take ? rows[rows.length - 1] : null;

        return {
            data,
            cursor: { after: lastRow?.id ?? null },
            count: data.length,
            // CommonService.cursorPaginate와 동일한 응답 계약(CursorPaginationResult)을
            // 맞추기 위한 필드. 절대 URL을 만드는 next는 이 엔드포인트에서 실제로
            // 구현하지 않았고(Frontend가 next를 사용하지 않음, cursor.after만 사용),
            // Frontend 타입과의 형태만 맞춰 항상 null로 둔다.
            next: null,
        };
    }

    async paginateFollowing(dto: BasePaginationDto, targetUserId: number, requestUserId?: number){
        await this.assertUserExists(targetUserId);

        const rows = await this.userFollowsRepository.find({
            where: this.buildFollowCursorWhere({ follower: { id: targetUserId } }, dto),
            relations: { followee: true },
            order: { createdAt: dto.order__createdAt },
            take: dto.take,
        });

        const data = await this.attachIsFollowing(rows.map((row) => row.followee), requestUserId);
        const lastRow = rows.length > 0 && rows.length === dto.take ? rows[rows.length - 1] : null;

        return {
            data,
            cursor: { after: lastRow?.id ?? null },
            count: data.length,
            // CommonService.cursorPaginate와 동일한 응답 계약(CursorPaginationResult)을
            // 맞추기 위한 필드. 절대 URL을 만드는 next는 이 엔드포인트에서 실제로
            // 구현하지 않았고(Frontend가 next를 사용하지 않음, cursor.after만 사용),
            // Frontend 타입과의 형태만 맞춰 항상 null로 둔다.
            next: null,
        };
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
