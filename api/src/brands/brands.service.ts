import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { inUse } from '../common/in-use';
import { isDuplicateKeyError } from '../common/mongo';
import { cleanName, normalizeName } from '../common/names';
import { Item } from '../items/item.schema';
import { Brand, BrandDocument } from './brand.schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name) private readonly brands: Model<Brand>,
    @InjectModel(Item.name) private readonly items: Model<Item>,
  ) {}

  async create(dto: CreateBrandDto): Promise<BrandDocument> {
    const brand = new this.brands();
    setName(brand, dto.name);
    return this.save(brand);
  }

  findAll(): Promise<BrandDocument[]> {
    return this.brands.find().sort({ normalizedName: 1 }).exec();
  }

  async exists(id: string): Promise<boolean> {
    return (await this.brands.exists({ _id: id })) !== null;
  }

  async findOne(id: string): Promise<BrandDocument> {
    const brand = await this.brands.findById(id).exec();
    if (!brand) throw new NotFoundException('Brand not found.');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandDocument> {
    const brand = await this.findOne(id);
    if (dto.name !== undefined) setName(brand, dto.name);
    return this.save(brand);
  }

  /** Deletes the brand unless items use it. */
  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    const itemCount = await this.items.countDocuments({ brandId: brand._id }).exec();
    if (itemCount > 0) throw inUse('Brand', brand.name, itemCount);
    await brand.deleteOne();
  }

  private async save(brand: BrandDocument): Promise<BrandDocument> {
    try {
      return await brand.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`A brand named "${brand.name}" already exists.`);
      }
      throw error;
    }
  }
}

function setName(brand: BrandDocument, name: string): void {
  brand.name = cleanName(name);
  brand.normalizedName = normalizeName(name);
}
