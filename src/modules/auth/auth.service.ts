import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from '../users/schemas/user.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { RoleEnum } from '../../common/enums/role.enum';

import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login-dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { auth } from '../../common/firebase';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register / Signup with Role
   */
  async register(dto: CreateAuthDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.userModel.findOne({ email });
    if (exists) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const role = (dto.role || RoleEnum.EMPLOYEE).toUpperCase();
    const employeeId =
      dto.employeeId?.toUpperCase() ||
      `EMP${Math.floor(100000 + Math.random() * 900000)}`;

    const user = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email,
      password: hashedPassword,
      role,
      employeeId,
      phone: dto.phone,
    });

    const token = await this.jwtService.signAsync({
      sub: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    });

    await this.sessionModel.create({
      userId: user._id,
      token,
      isActive: true,
    });

    const userObj: any = user.toObject();
    delete userObj.password;

    return {
      message: 'Registration successful',
      token,
      user: userObj,
    };
  }

  /**
   * Login User
   */
  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }

    const matched = await bcrypt.compare(dto.password, user.password);
    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    });

    user.lastLogin = new Date();
    await user.save();

    await this.sessionModel.create({
      userId: user._id,
      token,
      isActive: true,
    });

    const userObj: any = user.toObject();
    delete userObj.password;

    return {
      message: 'Login successful',
      token,
      user: userObj,
    };
  }

  /**
   * Google SSO Login
   */
  async googleLogin(idToken: string) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const email = decodedToken.email?.toLowerCase();

      if (!email) {
        throw new BadRequestException('Google token did not contain an email');
      }

      let user = await this.userModel.findOne({ email }).select('+password');

      if (!user) {
        // Auto-create user if not found
        const [firstName, ...lastNameParts] = (decodedToken.name || '').split(' ');
        const lastName = lastNameParts.join(' ') || 'User';
        
        // Generate a random password for OAuth created accounts since they won't use it anyway
        const randomPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        const employeeId = `EMP${Math.floor(100000 + Math.random() * 900000)}`;

        user = await this.userModel.create({
          firstName: firstName || 'Google',
          lastName,
          email,
          password: hashedPassword,
          role: RoleEnum.EMPLOYEE,
          employeeId,
          isActive: true,
        });
      } else {
        if (!user.isActive) {
          throw new UnauthorizedException('Account disabled');
        }
      }

      const token = await this.jwtService.signAsync({
        sub: user._id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      });

      user.lastLogin = new Date();
      await user.save();

      await this.sessionModel.create({
        userId: user._id,
        token,
        isActive: true,
      });

      const userObj: any = user.toObject();
      delete userObj.password;

      return {
        message: 'Google login successful',
        token,
        user: userObj,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Forgot Password
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user._id, email: user.email },
      { expiresIn: '15m' },
    );

    return {
      message: 'Password reset token generated',
      resetToken,
    };
  }

  /**
   * Reset Password
   */
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const payload = await this.jwtService.verifyAsync(dto.token);
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await user.save();

    return { message: 'Password reset successful' };
  }
}