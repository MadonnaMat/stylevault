import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { inUse } from '../common/in-use';
import { isDuplicateKeyError } from '../common/mongo';
import { cleanName, normalizeName } from '../common/names';
import { Item } from '../items/item.schema';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    @InjectModel(Item.name) private readonly items: Model<Item>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const category = new this.categories({ slot: dto.slot });
    setName(category, dto.name);
    return this.save(category);
  }

  findAll(): Promise<CategoryDocument[]> {
    return this.categories.find().sort({ normalizedName: 1 }).exec();
  }

  async exists(id: string): Promise<boolean> {
    return (await this.categories.exists({ _id: id })) !== null;
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const category = await this.categories.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const category = await this.findOne(id);
    if (dto.name !== undefined) setName(category, dto.name);
    if (dto.slot !== undefined) category.slot = dto.slot;
    return this.save(category);
  }

  /** Deletes the category unless items use it. */
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    const itemCount = await this.items.countDocuments({ categoryId: category._id }).exec();
    if (itemCount > 0) throw inUse('Category', category.name, itemCount);
    await category.deleteOne();
  }

  private async save(category: CategoryDocument): Promise<CategoryDocument> {
    try {
      return await category.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`A category named "${category.name}" already exists.`);
      }
      throw error;
    }
  }
}

function setName(category: CategoryDocument, name: string): void {
  category.name = cleanName(name);
  category.normalizedName = normalizeName(name);
}
