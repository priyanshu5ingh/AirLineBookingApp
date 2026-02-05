import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import Redlock from 'redlock';

@Injectable()
export class BookingsService {
  private prisma = new PrismaClient();
  private redis = new Redis({ host: 'localhost', port: 6379 });
  private redlock: Redlock;
  private logger = new Logger('BookingService');

  constructor() {
    this.redlock = new Redlock([this.redis], {
      retryCount: 3,
      retryDelay: 200,
    });
  }

  // Helper to generate a 6-char PNR (e.g., "A7X29Z")
  private generatePNR(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createBooking(userId: string, flightId: string, seatClass: 'ECONOMY' | 'BUSINESS') {
    const lockKey = `lock:flight:${flightId}:${seatClass}`;
    
    let lock;
    try {
      lock = await this.redlock.acquire([lockKey], 5000);
    } catch (error) {
      throw new ConflictException('System busy. Please try again.');
    }

    try {
      const inventory = await this.prisma.seatInventory.findFirst({
        where: { flightId: flightId, cabinClass: seatClass }
      });

      if (!inventory) throw new BadRequestException('Invalid flight or class');
      
      if (inventory.bookedSeats >= inventory.totalSeats) {
        throw new ConflictException(`Sold Out! No ${seatClass} seats remaining.`);
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            pnr: this.generatePNR(), // <--- FIX: Added PNR Generation
            userId: userId,
            flightId: flightId,
            status: 'CONFIRMED',
            baseAmount: 4500,
            totalAmount: 5000,
            seatNumber: "ASSIGNED_AT_GATE", 
          }
        });

        await tx.seatInventory.update({
          where: { id: inventory.id },
          data: { bookedSeats: { increment: 1 } }
        });

        return booking;
      });

      this.logger.log(`✅ Ticket Confirmed: ${result.pnr}`);
      return result;

    } catch (error) {
      throw error;
    } finally {
      if (lock) await lock.release();
    }
  }
}