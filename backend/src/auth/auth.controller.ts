import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Response,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const userAgent = req.headers['user-agent'];
    // Get real IP address (handle proxies)
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const result = await this.authService.login(loginDto, userAgent, ipAddress);

    // Set refresh token as httpOnly cookie
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token';
    const maxAge = loginDto.rememberMe
      ? 30 * 24 * 60 * 60 * 1000   // 30 days if rememberMe
      : 24 * 60 * 60 * 1000;        // 1 day if not
    res.cookie(cookieName, result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge,
      path: '/',
    });

    // Return response without the refresh_token (it's in the cookie)
    const { refresh_token, ...responseWithoutRefreshToken } = result;
    return responseWithoutRefreshToken;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const userAgent = req.headers['user-agent'];

    // Get refresh token from cookie (cookie-parser middleware)
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token';
    const token = req.cookies?.[cookieName] || refreshTokenDto.refresh_token;

    if (!token) {
      throw new UnauthorizedException('Refresh token not found in cookie');
    }

    const result = await this.authService.refreshTokens(token, userAgent);

    // Set new refresh token as httpOnly cookie
    res.cookie(cookieName, result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Return only access token
    return { access_token: result.access_token };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Get refresh token from cookie
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token';
    const token = req.cookies?.[cookieName] || refreshTokenDto.refresh_token;

    try {
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.REFRESH_TOKEN_SECRET,
        });

        await this.authService.logout(payload.jti);
      }
    } catch {
      // Even if token is invalid, clear the cookie
    }

    // Clear the cookie
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = (req as any).user;
    await this.authService.logoutAll(user.sub);

    // Clear the cookie
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token';
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return { message: 'Logged out from all devices successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: ExpressRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const user = (req as any).user;

    // Validate passwords match
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new UnauthorizedException('Password baru tidak cocok');
    }

    await this.authService.changePassword(
      user.sub,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return {
      success: true,
      message: 'Password berhasil diubah. Silakan login ulang.',
    };
  }

  @Get('me')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }
}
