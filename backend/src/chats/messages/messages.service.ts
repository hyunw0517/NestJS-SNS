import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessagesModel } from "./entity/messages.entity";
import { FindOperator, LessThan, MoreThan, MoreThanOrEqual, Repository } from "typeorm";
import { CommonService } from "src/common/common.service";
import { BasePaginationDto } from "src/common/dto/base-pagination.dto";
import { CreateMessagesDto } from "./dto/create-message.dto";

@Injectable()
export class ChatsMessagesService {
    constructor(
        @InjectRepository(MessagesModel)
        private readonly messagesRepository: Repository<MessagesModel>,
        private readonly commonService: CommonService,
    ){}

    async createMessage(
        dto: CreateMessagesDto,
        authorId: number,
    ){
        const message = await this.messagesRepository.save({
            chat: {
                id: dto.chatId,
            },
            author: {
                id: authorId,
            },
            message: dto.message,
        });

        return this.messagesRepository.findOneOrFail({
            where:{
                id: message.id,
            },
            relations:{
                chat: true,
                author: true,
            }
        });
    }

    // CommonService.paginate에 override where로 {chat: {id: chatId}}만 넘기면,
    // cursor pagination이 만든 where.id(more_than/less_than) 조건이 shallow merge에서
    // 통째로 덮여 사라진다(posts/comments/followers에서 이미 고친 것과 같은 버그 클래스).
    // 여기서도 cursor 조건 + chatId 조건 + joinedAt 조건을 전부 하나의 where 객체로
    // 직접 조립해서 override where에 넘겨 그 문제를 피한다.
    async paginateMessagesForChat(dto: BasePaginationDto, chatId: number, joinedAt: Date){
        let cursorIdCondition: FindOperator<number> | undefined;

        if( dto.where__id__more_than ){
            cursorIdCondition = MoreThan(dto.where__id__more_than);
        }else if( dto.where__id__less_than ){
            cursorIdCondition = LessThan(dto.where__id__less_than);
        }

        return this.commonService.paginate(
            dto,
            this.messagesRepository,
            {
                where: {
                    chat: { id: chatId },
                    // 초대(재초대 포함) 이전에 올라온 메시지는 애초에 조회 대상에서
                    // 제외한다 - cursor pagination을 아무리 더 불러와도 새지 않는다.
                    createdAt: MoreThanOrEqual(joinedAt),
                    ...(cursorIdCondition ? { id: cursorIdCondition } : {}),
                },
                relations: {
                    author: true,
                    chat: true,
                },
            },
            `chats/${chatId}/messages`,
        );
    }
}
