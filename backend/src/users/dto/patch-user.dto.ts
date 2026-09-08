import { IsOptional, IsString, Length } from "class-validator";
import { lengthValidationMessage } from "src/common/validation-message/length-validation.message";
import { stringValidationMessage } from "src/common/validation-message/string-validation.message";

// UsersModel의 데코레이터를 그대로 재사용하지 않고 다시 선언하는 이유:
// handle/bio/profileImage/coverImage는 "값 있음(수정) / undefined(유지) / null(제거)"
// 3가지 상태를 구분해야 하는데, 엔티티의 타입은 null을 허용하지 않는다(string | undefined).
// class-validator의 IsOptional은 null/undefined를 동일하게 건너뛰므로 검증 동작은
// 그대로 유지되면서, 타입에서만 null을 명시적으로 허용한다.
export class PatchUserDto {
    @IsString({
        message: stringValidationMessage,
    })
    @Length(1, 20, {
        message: lengthValidationMessage,
    })
    @IsOptional()
    nickname?: string;

    // 빈 문자열/null -> handle 제거(UsersService에서 정규화). 값이 있을 때만 길이 검증.
    @IsString({
        message: stringValidationMessage,
    })
    @Length(1, 30, {
        message: lengthValidationMessage,
    })
    @IsOptional()
    handle?: string | null;

    // 빈 문자열/null -> bio 제거.
    @IsString({
        message: stringValidationMessage,
    })
    @Length(0, 200, {
        message: lengthValidationMessage,
    })
    @IsOptional()
    bio?: string | null;

    // undefined: 기존 이미지 유지 / null: 이미지 제거 /
    // string: POST /common/image로 업로드된 temp 파일명(posts의 images 배열과 동일한 관례,
    // 풀 URL이 아닌 파일명만 보낸다)
    @IsString({
        message: stringValidationMessage,
    })
    @IsOptional()
    profileImage?: string | null;

    @IsString({
        message: stringValidationMessage,
    })
    @IsOptional()
    coverImage?: string | null;
}
