import { SLOTS, type Slot } from '@stylevault/shared';
import { IsOneOf, IsRequiredText } from '../../common/validators';

export class CreateCategoryDto {
  @IsRequiredText('name')
  name: string;

  @IsOneOf('slot', SLOTS)
  slot: Slot;
}
