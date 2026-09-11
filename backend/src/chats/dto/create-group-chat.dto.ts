import { ArrayNotEmpty, IsNumber, IsString, Length } from "class-validator";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";
import { lengthValidationMessage } from "src/common/validation-message/length-validation.message";

export class CreateGroupChatDto {
    // ChatsModel.name은 DIRECT/GROUP이 공유하는 nullable 컬럼이라 @IsOptional이지만,
    // 그룹 생성 시에는 필수이므로 PickType으로 그 optional을 물려받지 않고 여기서
    // 새로 필수로 선언한다.
    @IsString({
        message: stringValidationMessage,
    })
    @Length(1, 50, {
        message: lengthValidationMessage,
    })
    name: string;

    // 로그인 사용자(생성자)는 별도로 자동 포함되므로 여기엔 "나머지" 참여자만 담는다.
    // 본인 id가 섞여 들어오거나 중복 id가 있어도 서비스에서 정규화한다.
    @IsNumber({}, { each: true })
    @ArrayNotEmpty()
    userIds: number[];
}
