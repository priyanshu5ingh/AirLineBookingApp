import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // 1. REGISTER USER
  async register(dto: RegisterDto) {
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    // Create User (Default role: CUSTOMER, Tier: STANDARD)
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        fullName: dto.fullName,
        // We link them to the 'STANDARD' tier automatically
        tier: { connect: { name: 'STANDARD' } }, 
      },
    });

    return { message: 'User registered successfully', userId: user.id };
  }

  // 2. LOGIN USER
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Compare Password
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    // Generate Token
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