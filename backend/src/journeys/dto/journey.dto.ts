import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';
import { ChairType, Source } from '@prisma/client';

export class CreateJourneyDto {
  @IsOptional() @IsString() ticketNo?: string;
  @IsNotEmpty() @IsString() trainName: string;
  @IsOptional() @IsString() trainNumber?: string;
  @IsNotEmpty() @IsString() fromStation: string;
  @IsNotEmpty() @IsString() toStation: string;
  @IsNotEmpty() @IsDateString() journeyDate: string;
  @IsNotEmpty() @IsString() departureTime: string;
  @IsOptional() @IsString() arrivalTime?: string;
  @IsOptional() @IsEnum(ChairType) chairType?: ChairType;
  @IsOptional() @IsString() coachNo?: string;
  @IsOptional() @IsString() seatNo?: string;
  @IsOptional() @IsNumber() fare?: number;
  @IsOptional() @IsString() passengerName?: string;
  @IsOptional() @IsString() boardingPoint?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsEnum(Source) source?: Source;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateJourneyDto {
  @IsOptional() @IsString() ticketNo?: string;
  @IsOptional() @IsString() trainName?: string;
  @IsOptional() @IsString() trainNumber?: string;
  @IsOptional() @IsString() fromStation?: string;
  @IsOptional() @IsString() toStation?: string;
  @IsOptional() @IsDateString() journeyDate?: string;
  @IsOptional() @IsString() departureTime?: string;
  @IsOptional() @IsString() arrivalTime?: string;
  @IsOptional() @IsEnum(ChairType) chairType?: ChairType;
  @IsOptional() @IsString() coachNo?: string;
  @IsOptional() @IsString() seatNo?: string;
  @IsOptional() @IsNumber() fare?: number;
  @IsOptional() @IsString() passengerName?: string;
  @IsOptional() @IsString() boardingPoint?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsEnum(Source) source?: Source;
  @IsOptional() @IsString() notes?: string;
}

export class QueryJourneyDto {
  @IsOptional() @IsString() fromStation?: string;
  @IsOptional() @IsString() toStation?: string;
  @IsOptional() @IsString() trainName?: string;
  @IsOptional() @IsString() departureTime?: string;
  @IsOptional() @IsString() chairType?: string;
  @IsOptional() @IsString() dayNight?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() search?: string;
}
