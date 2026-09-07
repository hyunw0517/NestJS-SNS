import { ValidationArguments } from "class-validator";

export const notEmptyValidationMessage = (args: ValidationArguments) => {
    return `${args.property} 값을 입력해 주세요.`
}