import { IfPresent, IsRequiredText } from '../../common/validators';

export class UpdateBrandDto {
  @IfPresent()
  @IsRequiredText('name')
  name?: string;
}
