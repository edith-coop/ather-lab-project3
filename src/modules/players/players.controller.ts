import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlayersService } from './players.service';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CreatePlayerDto, IncrementScoreDto, UpdatePlayerDto, RemovePlayerDto } from './dto/player.dto';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new player' })
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playersService.create(createPlayerDto.name, createPlayerDto.periods);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update player info (name)' })
  @ApiParam({ name: 'id', description: 'Player ID' })
  update(
    @Param('id') id: string,
    @Body() updatePlayerDto: UpdatePlayerDto
  ) {
    return this.playersService.update(id, updatePlayerDto.name);
  }

  @Post(':id/score/increment')
  @ApiOperation({ summary: 'Increment player score' })
  @ApiParam({ name: 'id', description: 'Player ID' })
  incrementScore(
    @Param('id') id: string,
    @Body() incrementScoreDto: IncrementScoreDto
  ) {
    return this.playersService.incrementScore(id, incrementScoreDto.increment, incrementScoreDto.periods);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player info' })
  @ApiParam({ name: 'id', description: 'Player ID' })
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove player' })
  @ApiParam({ name: 'id', description: 'Player ID' })
  remove(
    @Param('id') id: string,
    @Body() removePlayerDto: RemovePlayerDto
  ) {
    return this.playersService.remove(id, removePlayerDto.periods);
  }
}
