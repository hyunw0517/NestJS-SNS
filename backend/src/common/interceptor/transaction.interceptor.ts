import { CallHandler, ExecutionContext, HttpException, Injectable, InternalServerErrorException, NestInterceptor } from "@nestjs/common";
import { catchError, concatMap, from, Observable } from "rxjs";
import { DataSource } from "typeorm";

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    constructor(
        private readonly dataSource: DataSource,
    ){}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();

        // 쿼리러너 1) 트랜잭션과 관련된 모든 쿼리를 담당할 쿼리 러너 생성
        const qr = this.dataSource.createQueryRunner();

        // 쿼리러너 2) 쿼리 러너에 연결
        await qr.connect();

        // 쿼리러너 3) 쿼리 러너에서 트랜잭션을 시작한다. -> 이 시점부터 같은 쿼리 러너를 사용하면 트랜잭션 안에서 데이터베이스 액션을 실행할 수 있다.
        await qr.startTransaction();

        req.queryRunner = qr;

        return next.handle()
            .pipe(
                // tap(async () => ...)은 콜백이 async여도 RxJS가 그 Promise를 기다려주지 않는다.
                // 그래서 commitTransaction()이 끝나기 전에 HTTP 응답이 먼저 나갈 수 있었다
                // (응답 직후 재조회하면 커밋 전 데이터를 읽는 race condition의 원인).
                // concatMap은 반환한 Promise/Observable이 완료될 때까지 실제로 기다렸다가
                // 그 다음에야 값을 흘려보내므로, commit이 끝난 뒤에만 응답이 나가게 된다.
                concatMap((value) =>
                    from(
                        (async () => {
                            await qr.commitTransaction();
                            await qr.release();

                            return value;
                        })(),
                    ),
                ),
                catchError(
                    async (e)=>{
                        await qr.rollbackTransaction();
                        await qr.release();

                        // ValidationPipe 등에서 던진 HttpException(예: 400)은 원래 상태 코드를 유지하고,
                        // 그 외의 예상치 못한 오류만 500으로 감싼다.
                        if( e instanceof HttpException ){
                            throw e;
                        }

                        throw new InternalServerErrorException(e.message);
                    }
                ),
            );
    }
}
