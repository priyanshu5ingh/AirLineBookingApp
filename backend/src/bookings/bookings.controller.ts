import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  // 🔒 THIS LINE ACTIVATES THE SECURITY
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.createBooking(
      createBookingDto.userId,
      createBookingDto.flightId,
      createBookingDto.seatClass,
    );
  }
}