import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export const FINDER_TARGETS = [
  'none',
  'all',
  'top-left',
  'top-right',
  'bottom-left',
] as const;

export type FinderTarget = (typeof FINDER_TARGETS)[number];

export class GenerateQrDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  value!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(128)
  @Max(2048)
  size?: number = 512;

  @IsOptional()
  @IsString()
  darkColor?: string = '#0B1F1A';

  @IsOptional()
  @IsString()
  lightColor?: string = '#F7F3EB';

  @IsOptional()
  @IsIn(FINDER_TARGETS)
  finderTarget?: FinderTarget = 'none';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(12)
  @Max(35)
  centerScale?: number = 22;

  @IsOptional()
  @IsIn(['png', 'svg'])
  format?: 'png' | 'svg' = 'png';
}
