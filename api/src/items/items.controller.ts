import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ObjectIdPipe } from '../common/mongo';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

const ItemId = new ObjectIdPipe('Item');

@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Post()
  async create(@Body() dto: CreateItemDto, @Res({ passthrough: true }) res: Response) {
    const item = await this.items.create(dto);
    res.location(`/api/items/${item.id}`);
    return item;
  }

  @Get()
  findAll() {
    return this.items.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ItemId) id: string) {
    return this.items.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ItemId) id: string, @Body() dto: UpdateItemDto) {
    return this.items.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ItemId) id: string) {
    return this.items.remove(id);
  }
}
