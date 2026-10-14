import { OCCASIONS, SEASONS, type Occasion, type Season } from '@stylevault/shared';
import { IsOptional } from 'class-validator';
import { IsHexColor, IsListOf, IsOptionalText, IsReference, IsRequiredText } from '../../common/validators';

export class CreateItemDto {
  @IsRequiredText('name')
  name: string;

  @IsReference('category', { required: true })
  categoryId: string;

  @IsOptional()
  @IsReference('brand', { required: false })
  brandId?: string | null;

  @IsHexColor('primary color', { required: true })
  primaryColor: string;

  @IsOptional()
  @IsHexColor('secondary color', { required: false })
  secondaryColor?: string | null;

  @IsOptional()
  @IsListOf('season', SEASONS)
  seasons?: Season[];

  @IsOptional()
  @IsListOf('occasion', OCCASIONS)
  occasions?: Occasion[];

  @IsOptional()
  @IsOptionalText('notes')
  notes?: string | null;
}
