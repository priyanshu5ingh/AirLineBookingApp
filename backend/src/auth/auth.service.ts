// 1. FORCE LOAD .ENV
import 'dotenv/config'; 

import { Injectable, ConflictException, UnauthorizedException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor(private jwtService: JwtService) {
    // Debug: Check if the password was found
    if (!process.env.DATABASE_URL) {
      console.error("❌ CRITICAL ERROR: .env file not found or DATABASE_URL is missing!");
    } else {
      console.log("✅ .env loaded. Database URL found.");
    }

    // 2. Initialize Prisma with the URL explicitly
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // --- REGISTER ---
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        fullName: dto.fullName,
        tier: { connect: { name: 'STANDARD' } }, 
      },
    });

    return { message: 'User registered successfully', userId: user.id };
  }

  // --- LOGIN ---
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}