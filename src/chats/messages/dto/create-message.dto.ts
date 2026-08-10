import { IsNumber } from "class-validator";
import { MessagesModel } from "../entity/messages.entity";
import { PickType } from "@nestjs/mapped-types";

export class CreateMessagesDto extends PickType(
    MessagesModel, 
    ['message']
){
    @IsNumber()
    chatId: number;
}
