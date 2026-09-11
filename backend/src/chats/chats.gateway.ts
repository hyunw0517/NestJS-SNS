import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { EnterChatDto } from "./dto/enter-chat.dto";
import { CreateMessagesDto } from "./messages/dto/create-message.dto";
import { ChatsMessagesService } from "./messages/messages.service";
import { UnauthorizedException, UseFilters, UsePipes, ValidationPipe } from "@nestjs/common";
import { SocketCatchHttpExceptionFilter } from "src/common/exception-filter/socket-catch-http.exception-filter";
import { UsersModel } from "src/users/entity/users.entity";
import { UsersService } from "src/users/users.service";
import { AuthService } from "src/auth/auth.service";
import { ChatsService } from "./chats.service";

type AuthedSocket = Socket & { user: UsersModel };

@WebSocketGateway({
    // ws://localhost:3000/chats
    namespace: 'chats'
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect {

    constructor(
        private readonly chatsService: ChatsService,
        private readonly messagesService: ChatsMessagesService,
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
    ){}

    @WebSocketServer()
    server: Server;

    // OnGatewayInit - handshake 단계에서 인증하는 socket.io 미들웨어를 등록한다.
    // handleConnection에서 사후 검증하는 대신 여기서 하면, 인증 실패 시 next(error)로
    // 클라이언트의 connect_error에 실제 사유가 전달돼(재연결/재로그인 판단에 쓸 수 있음)
    // 매번 조용히 disconnect되는 것보다 다루기 쉽다.
    afterInit(server: Server){
        // socket.io의 use() 콜백 타입은 동기(void 반환)를 기대해 async 함수를 직접
        // 넘기면 no-misused-promises에 걸린다. 내부를 즉시실행 async 함수로 감싸고
        // void로 명시해 "의도적으로 기다리지 않음"을 표시한다(에러는 안쪽 try/catch가
        // 전부 처리하므로 흘러나갈 unhandled rejection이 없다).
        server.use((socket: AuthedSocket, next) => {
            void (async () => {
                try{
                    // 브라우저에서 다루기 쉬운 handshake auth 방식만 허용한다(header 방식 제거).
                    // ex) io(url, { auth: { token: accessToken } })
                    const token = socket.handshake.auth?.token;

                    if( !token || typeof token !== 'string' ){
                        throw new UnauthorizedException('토큰이 없습니다.');
                    }

                    const payload = this.authService.verifyToken(token);

                    if( payload.type !== 'access' ){
                        throw new UnauthorizedException('Access Token이 아닙니다.');
                    }

                    const user = await this.usersService.getUserByEmail(payload.email);

                    if( !user ){
                        throw new UnauthorizedException('존재하지 않는 사용자입니다.');
                    }

                    socket.user = user;

                    next();
                }catch(e){
                    next(e instanceof Error ? e : new Error('인증에 실패했습니다.'));
                }
            })();
        });
    }

    // OnGatewayDisconnect
    handleDisconnect(socket: Socket){
        console.log(`on disconnect called: ${socket.id}`);
    }

    handleConnection(socket: AuthedSocket) {
        console.log(`on connect called: ${socket.id}, user: ${socket.user?.id}`);
    }

    @SubscribeMessage('enter_chat')
    @UsePipes(new ValidationPipe({
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
    }))
    @UseFilters(SocketCatchHttpExceptionFilter)
    async enterChat(
        // 방의 chat ID들을 리스트로 받는다.
        @MessageBody() data: EnterChatDto,
        @ConnectedSocket() socket: AuthedSocket,
    ){
        // 존재 확인뿐 아니라, 요청한 socket의 user가 실제 활성 참여자인지까지 확인한다
        // (남의 chatId를 알아도 join할 수 없도록, 퇴장한 사용자도 다시 join 불가).
        for(const chatId of data.chatIds){
            await this.chatsService.assertUserIsActiveMember(chatId, socket.user.id);
        }

        socket.join( data.chatIds.map((x) => x.toString()) );
    }

    // 자진 퇴장 REST 호출 직후 프론트가 명시적으로 호출한다. 이미 REST로 퇴장 처리된
    // 뒤에 불릴 수 있으므로(활성 membership이 이미 사라진 상태) active membership
    // 검증을 요구하지 않는다 - 그냥 순수하게 이 소켓을 해당 room에서 빼는 것뿐이다.
    // room에 애초에 속해있지 않았거나 이미 나간 상태로 다시 불려도 socket.leave()는
    // 안전하게 아무 일도 하지 않는다.
    @SubscribeMessage('leave_chat')
    @UsePipes(new ValidationPipe({
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
    }))
    leaveChatRoom(
        @MessageBody() data: EnterChatDto,
        @ConnectedSocket() socket: AuthedSocket,
    ){
        for(const chatId of data.chatIds){
            socket.leave(chatId.toString());
        }
    }

    // 이벤트 리스닝 -> socket.on('send_message', (message)=>{ console.log(message) });
    @SubscribeMessage('send_message')
    @UsePipes(new ValidationPipe({
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
    }))
    @UseFilters(SocketCatchHttpExceptionFilter)
    async sendMessage(
        @MessageBody() dto: CreateMessagesDto,
        @ConnectedSocket() socket: AuthedSocket,
    ){
        // 활성 참여자가 아니면 저장 자체를 막는다(room에 join하지 않은 채로 chatId를 직접
        // 보내는 시도, 그리고 퇴장한 뒤에도 기존 소켓이 room에 남아있는 상태로 보내는
        // 시도까지 매 전송마다 다시 확인해 차단한다).
        await this.chatsService.assertUserIsActiveMember(dto.chatId, socket.user.id);

        const message = await this.messagesService.createMessage(
            dto,
            socket.user.id,
        );

        // author 엔티티를 그대로 보내지 않고(email 등 민감정보 포함), 필요한 필드만
        // 추려 보낸다. REST와 달리 socket emit은 ClassSerializerInterceptor(@Exclude)의
        // 적용을 받지 않으므로 여기서 직접 걸러야 한다.
        const payload = {
            id: message.id,
            chatId: message.chat.id,
            content: message.message,
            createdAt: message.createdAt,
            author: {
                id: message.author.id,
                nickname: message.author.nickname,
                handle: message.author.handle,
                profileImage: message.author.profileImage,
            },
        };

        // 발신자를 포함한 room의 모든 연결에 보낸다(발신자도 저장된 결과를 받아
        // 자신의 메시지를 표시해야 하므로 socket.to()가 아니라 server.to()를 쓴다).
        this.server.to(message.chat.id.toString()).emit('receive_message', payload);
    }
}
