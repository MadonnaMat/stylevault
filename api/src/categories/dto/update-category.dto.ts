import { SLOTS, type Slot } from '@stylevault/shared';
import { IfPresent, IsOneOf, IsRequiredText } from '../../common/validators';

export class UpdateCategoryDto {
  @IfPresent()
  @IsRequiredText('name')
  name?: string;

  @IfPresent()
  @IsOneOf('slot', SLOTS)
  slot?: Slot;
}
