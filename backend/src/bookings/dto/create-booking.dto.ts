import { IsString, IsUUID, IsEnum, IsNotEmpty } from 'class-validator';

export enum SeatClass {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST = 'FIRST',
}

export class CreateBookingDto {
  @IsNotEmpty()
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Flight ID must be a valid UUID' })
  flightId: string;

  @IsNotEmpty()
  @IsEnum(SeatClass, { message: 'Seat Class must be ECONOMY, BUSINESS, or FIRST' })
  seatClass: SeatClass;
}