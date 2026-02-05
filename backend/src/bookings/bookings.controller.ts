import { Controller, Post, Body } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() body: { userId: string; flightId: string; seatClass: 'ECONOMY' | 'BUSINESS' }) {
    return this.bookingsService.createBooking(body.userId, body.flightId, body.seatClass);
  }
}