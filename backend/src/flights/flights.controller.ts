import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { FlightsService } from './flights.service';

@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('search')
  async search(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    if (!origin || !destination || !date) {
      throw new BadRequestException('Please provide origin, destination, and date (YYYY-MM-DD)');
    }
    
    return this.flightsService.searchFlights(origin, destination, date);
  }
}