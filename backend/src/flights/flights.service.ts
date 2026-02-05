import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

@Injectable()
export class FlightsService {
  private prisma = new PrismaClient();
  private redis = new Redis({ host: 'localhost', port: 6379 }); // Connects to Docker Redis
  private logger = new Logger('FlightsService');

  async onModuleInit() {
    await this.prisma.$connect();
  }

  // --- THE "CACHE-FIRST" SEARCH ENGINE ---
  async searchFlights(origin: string, destination: string, date: string) {
    // 1. Generate a unique Cache Key (e.g., "flight:BOM:DEL:2026-02-06")
    const cacheKey = `flight:${origin}:${destination}:${date.split('T')[0]}`;

    // 2. Check Redis (The Speed Layer)
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      this.logger.log(`⚡ CACHE HIT: Serving ${origin} -> ${destination} from Redis`);
      return JSON.parse(cachedData);
    }

    this.logger.log(`🐢 CACHE MISS: Querying Database for ${origin} -> ${destination}`);

    // 3. Query Postgres (The Data Layer)
    // We need to find flights where the Origin Airport matches the Code (e.g., "BOM")
    const flights = await this.prisma.flight.findMany({
      where: {
        originAirport: { iataCode: origin },
        destinationAirport: { iataCode: destination },
        // Simple date check: Flights scheduled for that specific day
        departureTime: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        airline: true,
        originAirport: true,
        destinationAirport: true,
        seatInventory: true, // Fetch available seats
      },
    });

    // 4. Save to Redis (TTL: 300 seconds = 5 minutes)
    // Next user who searches this will get the Instant Result
    if (flights.length > 0) {
      await this.redis.set(cacheKey, JSON.stringify(flights), 'EX', 300);
    }

    return flights;
  }
}