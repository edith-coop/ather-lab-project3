import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new season' })
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all seasons' })
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current active season' })
  getActiveSeason() {
    return this.seasonsService.getActiveSeason();
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Manually close a season' })
  @ApiParam({ name: 'id', description: 'Season ID' })
  closeSeason(@Param('id') id: string) {
    return this.seasonsService.closeSeason(id);
  }
}
