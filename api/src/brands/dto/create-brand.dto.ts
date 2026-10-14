import { IsRequiredText } from '../../common/validators';

export class CreateBrandDto {
  @IsRequiredText('name')
  name: string;
}
