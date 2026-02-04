import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: 'SUPER_SECRET_KEY_FOR_DEV_ONLY', // In production, we will use env variables
      signOptions: { expiresIn: '1d' }, // Token works for 1 day
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}