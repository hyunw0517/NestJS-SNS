import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatsModel } from './entity/chats.entity';
import { ChatMembersModel } from './entity/chat-members.entity';
import { In, IsNull, QueryRunner, Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { MessagesModel } from './messages/entity/messages.entity';
import { ChatType } from './const/chat-type.const';
import { ChatMemberRole } from './const/chat-member-role.const';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';

// joinedAt/leftAt은 반드시 DB 서버의 now()로 채운다(Node의 new Date()를 쓰지 않는다).
// messages.createdAt은 @CreateDateColumn()으로 이미 DB now()로 채워지는데, joinedAt
// history 필터(createdAt >= joinedAt)가 두 컬럼을 비교하므로 같은 시계를 써야 한다 -
// 이 환경에서 Node 프로세스의 시스템 시계가 실제로 DB 서버(UTC)보다 수 시간 앞서 있는
// 것을 확인했고(new Date()로 넣으면 방금 초대된 사용자가 그 이후 메시지도 전부 "초대 전"
// 으로 취급되어 하나도 못 보는 버그로 실제 재현됨), new Date() 대신 이 raw SQL 함수
// 참조를 써서 TypeORM이 값을 파라미터로 보내지 않고 DB가 직접 계산하게 한다.
const DB_NOW = () => 'now()';

@Injectable()
export class ChatsService {
    constructor(
        @InjectRepository(ChatsModel)
        private readonly chatsRepository: Repository<ChatsModel>,
        @InjectRepository(ChatMembersModel)
        private readonly chatMembersRepository: Repository<ChatMembersModel>,
        @InjectRepository(MessagesModel)
        private readonly messagesRepository: Repository<MessagesModel>,
        private readonly usersService: UsersService,
    ){}

    private getChatsRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<ChatsModel>(ChatsModel) : this.chatsRepository;
    }

    private getChatMembersRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<ChatMembersModel>(ChatMembersModel) : this.chatMembersRepository;
    }

    private getMessagesRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<MessagesModel>(MessagesModel) : this.messagesRepository;
    }

    // ================= 권한/조회 helper =================
    // REST(controller)/socket(gateway)/service 내부(초대·퇴장·OWNER 이전)가 전부 이
    // 몇 개의 helper만 공유하도록 모아둔다(요청하신 책임 분리).

    // 활성(leftAt이 없는) membership 하나. 없으면 null(존재하지 않거나 이미 나간 경우 구분 안 함
    // - 구분이 필요한 호출부는 assertUserIsActiveMember의 404/403 분기를 쓴다).
    private async getActiveMembership(chatId: number, userId: number, qr?: QueryRunner){
        const chatMembersRepository = this.getChatMembersRepository(qr);

        return chatMembersRepository.findOne({
            where: { chat: { id: chatId }, user: { id: userId }, leftAt: IsNull() },
        });
    }

    // chat의 활성 멤버 전원(+user relation). joinedAt ASC, id ASC로 정렬해두면 OWNER
    // 이전 시 "가장 오래 참여한 멤버" 선정과 멤버 목록 조회 양쪽에 그대로 쓸 수 있다.
    private async getActiveMembers(chatId: number, qr?: QueryRunner){
        const chatMembersRepository = this.getChatMembersRepository(qr);

        return chatMembersRepository.find({
            where: { chat: { id: chatId }, leftAt: IsNull() },
            relations: { user: true },
            order: { joinedAt: 'ASC', id: 'ASC' },
        });
    }

    // Message 조회/발신(REST + socket) 공통 권한 검증. 존재하지 않으면 404, 활성 참여자가
    // 아니면(참여한 적 없거나 이미 나간 경우 모두) 403 - 둘 다 HttpException이라
    // SocketCatchHttpExceptionFilter가 그대로 'exception' 이벤트로 변환해준다.
    // joinedAt 기반 history 필터 등에 바로 쓸 수 있도록 membership을 반환한다.
    async assertUserIsActiveMember(chatId: number, userId: number, qr?: QueryRunner){
        const chatsRepository = this.getChatsRepository(qr);
        const chatExists = await chatsRepository.exists({ where: { id: chatId } });

        if( !chatExists ){
            throw new NotFoundException(`id: ${chatId} Chat은 존재하지 않습니다.`);
        }

        const membership = await this.getActiveMembership(chatId, userId, qr);

        if( !membership ){
            throw new ForbiddenException('이 채팅방에 참여하고 있지 않습니다.');
        }

        return membership;
    }

    private async assertUserIsOwner(chatId: number, userId: number, qr?: QueryRunner){
        const membership = await this.assertUserIsActiveMember(chatId, userId, qr);

        if( membership.role !== ChatMemberRole.OWNER ){
            throw new ForbiddenException('OWNER만 할 수 있는 작업입니다.');
        }

        return membership;
    }

    private async assertGroupChat(chatId: number, qr?: QueryRunner){
        const chatsRepository = this.getChatsRepository(qr);
        const chat = await chatsRepository.findOne({ where: { id: chatId } });

        if( !chat ){
            throw new NotFoundException(`id: ${chatId} Chat은 존재하지 않습니다.`);
        }

        if( chat.type !== ChatType.GROUP ){
            throw new BadRequestException('그룹 채팅에서만 가능한 작업입니다.');
        }

        return chat;
    }

    // ================= Direct chat =================

    // 1:1 DM. 같은 두 사용자 조합으로 계속 새 방을 만들지 않도록, 두 사용자가 정확히
    // 함께 속한 기존 DIRECT chat이 있으면 그걸 반환하고 없을 때만 새로 만든다.
    async findOrCreateDirectChat(userId: number, targetUserId: number){
        if( userId === targetUserId ){
            throw new BadRequestException('자기 자신에게 DM을 보낼 수 없습니다.');
        }

        const targetExists = await this.usersService.getUsersRepotiroy().exists({
            where: { id: targetUserId },
        });

        if( !targetExists ){
            throw new NotFoundException(`id: ${targetUserId} User는 존재하지 않습니다.`);
        }

        const existing = await this.findExistingDirectChat(userId, targetUserId);

        if( existing ){
            return this.toChatSummary(existing, userId);
        }

        const chat = await this.chatsRepository.save({
            type: ChatType.DIRECT,
        });

        // 두 참여자를 같은 시점에 생성한다(1:1 DM은 항상 생성과 동시에 둘 다 참여).
        // DIRECT에는 OWNER 개념이 없으므로 둘 다 기본값(MEMBER)으로 둔다.
        await this.chatMembersRepository.save([
            { chat: { id: chat.id }, user: { id: userId }, joinedAt: DB_NOW } as unknown as Partial<ChatMembersModel>,
            { chat: { id: chat.id }, user: { id: targetUserId }, joinedAt: DB_NOW } as unknown as Partial<ChatMembersModel>,
        ]);

        return this.toChatSummary(chat, userId);
    }

    // QueryBuilder 없이(이 프로젝트 관례) userId/targetUserId가 공통으로 속한 DIRECT chat을
    // 찾는다. 두 사용자의 (활성) 참여 row를 한 번에 불러와 chat 단위로 묶은 뒤, type이
    // DIRECT이고 정확히 이 둘로만 이루어진 chat인지 확인한다.
    private async findExistingDirectChat(userId: number, targetUserId: number){
        const memberships = await this.chatMembersRepository.find({
            where: { user: { id: In([userId, targetUserId]) }, leftAt: IsNull() },
            relations: { chat: true, user: true },
        });

        const candidatesByChatId = new Map<number, { chat: ChatsModel; memberIds: Set<number> }>();

        for( const membership of memberships ){
            if( membership.chat.type !== ChatType.DIRECT ){
                continue;
            }

            const chatId = membership.chat.id;
            const candidate = candidatesByChatId.get(chatId) ?? { chat: membership.chat, memberIds: new Set<number>() };
            candidate.memberIds.add(membership.user.id);
            candidatesByChatId.set(chatId, candidate);
        }

        for( const { chat, memberIds } of candidatesByChatId.values() ){
            if( memberIds.size === 2 && memberIds.has(userId) && memberIds.has(targetUserId) ){
                const totalMemberCount = await this.chatMembersRepository.count({
                    where: { chat: { id: chat.id }, leftAt: IsNull() },
                });

                // 후보 chat에 이 둘 외 다른 활성 멤버가 없는지 한 번 더 확인.
                if( totalMemberCount === 2 ){
                    return chat;
                }
            }
        }

        return null;
    }

    // ================= Group chat =================

    // 그룹채팅 생성. chat 생성 + memberships 생성을 하나의 트랜잭션으로 묶는다
    // (TransactionInterceptor가 컨트롤러에서 qr을 만들어 넘겨준다).
    async createGroupChat(creatorId: number, dto: CreateGroupChatDto, qr?: QueryRunner){
        // 본인 id가 섞여 들어와도 중복 membership을 만들지 않도록 제외하고, 중복 id도 정리한다.
        const normalizedUserIds = [...new Set(dto.userIds)].filter((id) => id !== creatorId);

        const totalMemberCount = normalizedUserIds.length + 1; // + 생성자

        if( totalMemberCount < 3 ){
            throw new BadRequestException('그룹 채팅은 본인을 포함해 최소 3명이 필요합니다.');
        }

        const existingUserCount = await this.usersService.getUsersRepotiroy(qr).count({
            where: { id: In(normalizedUserIds) },
        });

        if( existingUserCount !== normalizedUserIds.length ){
            throw new BadRequestException('존재하지 않는 사용자가 포함되어 있습니다.');
        }

        const chatsRepository = this.getChatsRepository(qr);
        const chatMembersRepository = this.getChatMembersRepository(qr);

        const chat = await chatsRepository.save({
            type: ChatType.GROUP,
            name: dto.name,
        });

        await chatMembersRepository.save([
            { chat: { id: chat.id }, user: { id: creatorId }, role: ChatMemberRole.OWNER, joinedAt: DB_NOW },
            ...normalizedUserIds.map((id) => ({
                chat: { id: chat.id },
                user: { id },
                role: ChatMemberRole.MEMBER,
                joinedAt: DB_NOW,
            })),
        ] as unknown as Partial<ChatMembersModel>[]);

        return this.toChatSummary(chat, creatorId, qr);
    }

    // 그룹 멤버 초대. GROUP에만, OWNER만 가능. 여러 명을 한 번에 처리하며 전부 하나의
    // 트랜잭션으로 묶는다(일부만 성공 금지).
    async inviteMembers(chatId: number, inviterId: number, userIds: number[], qr?: QueryRunner){
        const chat = await this.assertGroupChat(chatId, qr);
        await this.assertUserIsOwner(chatId, inviterId, qr);

        const normalizedUserIds = [...new Set(userIds)].filter((id) => id !== inviterId);

        if( normalizedUserIds.length === 0 ){
            throw new BadRequestException('초대할 사용자가 없습니다.');
        }

        const existingUserCount = await this.usersService.getUsersRepotiroy(qr).count({
            where: { id: In(normalizedUserIds) },
        });

        if( existingUserCount !== normalizedUserIds.length ){
            throw new BadRequestException('존재하지 않는 사용자가 포함되어 있습니다.');
        }

        const chatMembersRepository = this.getChatMembersRepository(qr);

        // 대상 사용자들의 이 chat에 대한 과거 membership(활성/비활성 모두)을 한 번에 조회해,
        // "이미 활성 멤버"(거부 대상)와 "예전에 나갔던 멤버"(row 재활용 대상)를 구분한다.
        const existingMemberships = await chatMembersRepository.find({
            where: { chat: { id: chatId }, user: { id: In(normalizedUserIds) } },
            relations: { user: true },
        });

        const alreadyActive = existingMemberships.some((membership) => !membership.leftAt);

        if( alreadyActive ){
            throw new BadRequestException('이미 참여 중인 사용자가 포함되어 있습니다.');
        }

        const rejoiningUserIds = new Set(existingMemberships.map((membership) => membership.user.id));

        // 재초대: (chat,user) unique 제약을 유지하기 위해 새 row를 만들지 않고 기존 row를
        // 재활성화한다. 이전 joinedAt은 버린다 - 재초대 이전 메시지가 다시 보이면 안 되므로.
        for( const membership of existingMemberships ){
            await chatMembersRepository.update(
                { id: membership.id },
                // leftAt은 entity에서 `Date | undefined`로 선언돼 있어(다른 nullable
                // 컬럼들과 동일한 이유 - TypeORM이 union 타입의 컬럼 타입을 추론하지
                // 못함) null을 명시적으로 쓰려는 이 경우에만 cast가 필요하다. 런타임에는
                // TypeORM이 null을 그대로 컬럼에 반영해 재활성화(leftAt 초기화)된다.
                { leftAt: null, joinedAt: DB_NOW, role: ChatMemberRole.MEMBER } as unknown as Partial<ChatMembersModel>,
            );
        }

        const newUserIds = normalizedUserIds.filter((id) => !rejoiningUserIds.has(id));

        if( newUserIds.length > 0 ){
            await chatMembersRepository.save(
                newUserIds.map((id) => ({
                    chat: { id: chatId },
                    user: { id },
                    role: ChatMemberRole.MEMBER,
                    joinedAt: DB_NOW,
                })) as unknown as Partial<ChatMembersModel>[],
            );
        }

        return this.toChatSummary(chat, inviterId, qr);
    }

    // 자진 퇴장. GROUP에만 가능. OWNER가 나가면서 다른 활성 멤버가 남아 있으면 가장 오래
    // 참여한 멤버(joinedAt ASC, id ASC)에게 자동으로 OWNER를 넘긴다. 본인 혼자 남은
    // 그룹이면 그대로 퇴장만 하고(활성 멤버 0명 - GET /chats 목록에서 자연히 제외된다),
    // chat row 자체는 지우지 않는다.
    async leaveChat(chatId: number, userId: number, qr?: QueryRunner){
        await this.assertGroupChat(chatId, qr);

        const membership = await this.assertUserIsActiveMember(chatId, userId, qr);
        const chatMembersRepository = this.getChatMembersRepository(qr);

        await chatMembersRepository.update(
            { id: membership.id },
            { leftAt: DB_NOW },
        );

        if( membership.role === ChatMemberRole.OWNER ){
            // 방금 leftAt을 세팅했으므로 이 조회는 본인을 자동으로 제외한다.
            const remainingActiveMembers = await this.getActiveMembers(chatId, qr);

            if( remainingActiveMembers.length > 0 ){
                const successor = remainingActiveMembers[0];

                await chatMembersRepository.update({ id: successor.id }, { role: ChatMemberRole.OWNER });
            }
        }

        return true;
    }

    // ================= 조회 =================

    // GET /chats 및 POST /chats/direct·group, POST /chats/:id/members 공통 응답 형태.
    // 민감정보(email 등) 없이 DIRECT/GROUP이 공존 가능한 하나의 shape로 내려준다.
    private async toChatSummary(chat: ChatsModel, userId: number, qr?: QueryRunner){
        const activeMembers = await this.getActiveMembers(chat.id, qr);
        const messagesRepository = this.getMessagesRepository(qr);

        const toParticipant = (member: ChatMembersModel) => ({
            id: member.user.id,
            nickname: member.user.nickname,
            handle: member.user.handle,
            profileImage: member.user.profileImage,
        });

        const isDirect = chat.type === ChatType.DIRECT;
        const otherMember = isDirect ? activeMembers.find((member) => member.user.id !== userId) ?? null : null;

        const lastMessage = await messagesRepository.findOne({
            where: { chat: { id: chat.id } },
            order: { createdAt: 'DESC' },
        });

        return {
            id: chat.id,
            type: chat.type,
            name: chat.name ?? null,
            // DIRECT: 상대방 한 명 / GROUP: null(대신 members를 본다)
            otherUser: otherMember && toParticipant(otherMember),
            // GROUP: 활성 멤버만 최소 표시용으로 / DIRECT: null(otherUser로 충분)
            members: isDirect ? null : activeMembers.map(toParticipant),
            memberCount: isDirect ? null : activeMembers.length,
            lastMessage: lastMessage?.message ?? null,
            lastMessageAt: lastMessage?.createdAt ?? chat.createdAt,
        };
    }

    // GET /chats: 로그인 사용자가 참여한 chat 목록(DIRECT+GROUP). 탈퇴(leftAt이 있는)
    // membership은 제외한다 - 퇴장한 GROUP은 목록에서 자연히 사라진다.
    async getUserChats(userId: number){
        const memberships = await this.chatMembersRepository.find({
            where: { user: { id: userId }, leftAt: IsNull() },
            relations: { chat: true },
        });

        const summaries = await Promise.all(
            memberships.map((membership) => this.toChatSummary(membership.chat, userId)),
        );

        return summaries.sort(
            (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
        );
    }

    // GET /chats/:chatId/members: 그룹 멤버 UI를 다음 단계에서 만들 수 있도록 최소 정보만
    // 반환한다. GROUP의 활성 멤버만 조회 가능(DIRECT는 400).
    async getChatMembers(chatId: number, requesterId: number){
        await this.assertGroupChat(chatId);
        await this.assertUserIsActiveMember(chatId, requesterId);

        const activeMembers = await this.getActiveMembers(chatId);

        return activeMembers.map((member) => ({
            id: member.user.id,
            nickname: member.user.nickname,
            handle: member.user.handle,
            profileImage: member.user.profileImage,
            role: member.role,
            joinedAt: member.joinedAt,
        }));
    }
}
