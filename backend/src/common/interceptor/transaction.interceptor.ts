import { CallHandler, ExecutionContext, Injectable, InternalServerErrorException, NestInterceptor } from "@nestjs/common";
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