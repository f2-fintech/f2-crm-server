import { Body, Controller, Get, Post, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty } from 'class-validator';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register User (Role: SUPER_ADMIN, ADMIN, MANAGER, TEAM_LEADER, EMPLOYEE)' })
  register(@Body() dto: CreateAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login User' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login or Register via Google SSO' })
  googleLogin(@Body() dto: GoogleLoginDto) {
    if (!dto.idToken) {
      throw new Error('idToken is required');
    }
    return this.authService.googleLogin(dto.idToken);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Forgot Password' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset Password' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Current Profile' })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user._id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Current Profile' })
  updateProfile(@Req() req: any, @Body() dto: any) {
    return this.authService.updateProfile(req.user._id, dto);
  }
}