import { ArrayNotEmpty, IsNumber } from "class-validator";

export class InviteChatMembersDto {
    // 중복/본인 id가 섞여 들어와도 서비스에서 정규화한다.
    @IsNumber({}, { each: true })
    @ArrayNotEmpty()
    userIds: number[];
}
