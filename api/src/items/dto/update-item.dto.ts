import { OCCASIONS, SEASONS, type Occasion, type Season } from '@stylevault/shared';
import { IsOptional } from 'class-validator';
import { IfPresent, IsHexColor, IsListOf, IsOptionalText, IsReference, IsRequiredText } from '../../common/validators';

/**
 * Every field is optional. Required fields can't be set to null; `brandId`,
 * `secondaryColor`, and `notes` can, which clears them.
 */
export class UpdateItemDto {
  @IfPresent()
  @IsRequiredText('name')
  name?: string;

  @IfPresent()
  @IsReference('category', { required: true })
  categoryId?: string;

  @IsOptional()
  @IsReference('brand', { required: false })
  brandId?: string | null;

  @IfPresent()
  @IsHexColor('primary color', { required: true })
  primaryColor?: string;

  @IsOptional()
  @IsHexColor('secondary color', { required: false })
  secondaryColor?: string | null;

  @IfPresent()
  @IsListOf('season', SEASONS)
  seasons?: Season[];

  @IfPresent()
  @IsListOf('occasion', OCCASIONS)
  occasions?: Occasion[];

  @IsOptional()
  @IsOptionalText('notes')
  notes?: string | null;
}
