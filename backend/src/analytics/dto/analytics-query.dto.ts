import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Shared filter set for every analytics aggregation. All fields are optional —
 * omitting them means "all time, all trains, all classes".
 */
export class AnalyticsQueryDto {
  /** Inclusive YYYY-MM-DD lower bound on journeyDate. */
  @IsOptional() @IsString() from?: string;
  /** Inclusive YYYY-MM-DD upper bound on journeyDate. */
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() trainName?: string;
  @IsOptional() @IsString() chairType?: string;
  @IsOptional() @IsString() fromStation?: string;
  @IsOptional() @IsString() toStation?: string;
  @IsOptional() @IsIn(['DAY', 'NIGHT']) dayNight?: string;
  /** Global multi-word search across train, route, station, PNR, passenger. */
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minFare?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxFare?: number;
  /** Optional monthly budget used for the spending-progress widget. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budget?: number;
}

export class JourneysTableQueryDto extends AnalyticsQueryDto {
  @IsOptional() @IsIn(['date', 'fare']) sort?: 'date' | 'fare';
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}
