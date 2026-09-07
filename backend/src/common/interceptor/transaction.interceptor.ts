import { CallHandler, ExecutionContext, HttpException, Injectable, InternalServerErrorException, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, tap } from "rxjs";
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
                tap(async ()=> {
                    await qr.commitTransaction();
                    await qr.release();
                })
            );
    }
}