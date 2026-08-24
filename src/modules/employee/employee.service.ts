import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/modules/user/repository';
import { PointHistoryRepository } from 'src/modules/redemptions/repository';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserStatus } from '../auth/constants/auth.constants';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { EmployeeDataDto, TopupPointsDto } from './dto/employee.dto';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { RolesRepository } from '../auth/repository';
import { TransactionService } from 'src/default/databases/transaction';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RolesRepository,
    private readonly pointHistoryRepository: PointHistoryRepository,
    private readonly transactionService: TransactionService
  ) {}

  /**
   * Core method — creates a new employee OR tops up an existing one.
   * Called by both the ingest endpoint (fashion data) and the topup endpoint.
   *
   * If mobile doesn't exist → create employee user, set points, write earn row.
   * If mobile exists as employee → add points on top, write earn row.
   * If mobile exists as a non-employee → throw conflict error.
   */
  private async upsertEmployee(data: EmployeeDataDto): Promise<{
    action: 'created' | 'topped_up';
    userId: number;
    mobile: string;
    pointsAdded: number;
    totalPoints: number;
  }> {
    const employeeRole = await this.roleRepository.findByName(UserRole.EMPLOYEE);
    if (!employeeRole) {
      throw new BusinessException({
        code: 'EMP_001',
        message: 'Employee role is not configured. Please seed the roles table.',
        statusCode: 500,
      });
    }

    const existing = await this.userRepository.findOne({ mobile: data.mobile }, ['role']);

    if (existing) {
      // Mobile exists — must be an employee for top-up, otherwise conflict
      if (existing.role?.name !== UserRole.EMPLOYEE) {
        throw new BusinessException({
          code: 'EMP_002',
          message: `Mobile ${data.mobile} is already registered as a ${existing.role?.name}. Cannot create employee with this number.`,
          statusCode: 409,
        });
      }

      // Top-up existing employee — lock the row inside a transaction so concurrent
      // top-ups don't clobber each other's point increments (lost-update fix).
      const transactionId = await CommonUtils.generateUniqueRefCode();

      const newPoints = await this.transactionService.runInTransaction(async (queryRunner) => {
        const lockedUser = await this.userRepository.findByIdForUpdate(existing.id, queryRunner);

        if (!lockedUser) {
          throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
        }

        const updatedPoints = Number(lockedUser.points) + data.points;

        await this.userRepository.updateById(
          lockedUser.id,
          {
            points: BigInt(updatedPoints),
            // update name if provided and different
            ...(data.name && { username: data.name }),
            ...(data.email && { email: data.email }),
          },
          queryRunner
        );

        // Write point history earn row
        await this.pointHistoryRepository.save(
          {
            user: { id: lockedUser.id } as any,
            points: data.points,
            description: data.description ?? 'Points granted by fashion',
            type: 'earn' as any,
            status: PointStatusEnum.added,
            date: new Date(),
            user_remaining_points: updatedPoints,
            taxable_points: 0,
            tds_points: 0,
            transaction_id: transactionId,
          },
          queryRunner
        );

        return updatedPoints;
      });

      return {
        action: 'topped_up',
        userId: Number(existing.id),
        mobile: data.mobile,
        pointsAdded: data.points,
        totalPoints: newPoints,
      };
    }

    // New employee — create user as ACTIVE directly, no approval flow
    const newUser = await this.userRepository.save({
      username: data.name,
      mobile: data.mobile,
      ...(data.email && { email: data.email }),
      ...(data.employeeCode && { code: data.employeeCode }),
      role: { id: employeeRole.id } as any,
      status: UserStatus.ACTIVE,
      points: BigInt(data.points),
      active: true,
      otpTrigger: true,
      isDefaultOtp: false,
      flag: 0,
      isTestRecord: false,
      otp_attempt_count: 0,
    });

    // Write initial earn row
    const transactionId = await CommonUtils.generateUniqueRefCode();
    await this.pointHistoryRepository.save({
      user: { id: newUser.id } as any,
      points: data.points,
      description: data.description ?? 'Initial points granted by fashion',
      type: 'earn' as any,
      status: PointStatusEnum.added,
      date: new Date(),
      user_remaining_points: data.points,
      taxable_points: 0,
      tds_points: 0,
      transaction_id: transactionId,
    });

    return {
      action: 'created',
      userId: Number(newUser.id),
      mobile: data.mobile,
      pointsAdded: data.points,
      totalPoints: data.points,
    };
  }

  /**
   * Ingest — accepts single or batch from fashion.
   * Processes each employee independently so one failure doesn't block the rest.
   */
  async ingest(employees: EmployeeDataDto[]): Promise<{
    processed: number;
    created: number;
    toppedUp: number;
    failed: number;
    results: Array<{
      mobile: string;
      status: 'success' | 'failed';
      action?: 'created' | 'topped_up';
      error?: string;
    }>;
  }> {
    const results: Array<{
      mobile: string;
      status: 'success' | 'failed';
      action?: 'created' | 'topped_up';
      error?: string;
    }> = [];

    let created = 0;
    let toppedUp = 0;
    let failed = 0;

    for (const emp of employees) {
      try {
        const result = await this.upsertEmployee(emp);
        results.push({
          mobile: emp.mobile,
          status: 'success',
          action: result.action,
        });
        if (result.action === 'created') created++;
        else toppedUp++;
      } catch (error) {
        failed++;
        results.push({
          mobile: emp.mobile,
          status: 'failed',
          error: error?.message ?? 'Unknown error',
        });
      }
    }

    return {
      processed: employees.length,
      created,
      toppedUp,
      failed,
      results,
    };
  }

  /**
   * Explicit top-up for an existing employee by their user id.
   */
  async topupById(employeeUserId: number, dto: TopupPointsDto) {
    const user = await this.userRepository.findOne({ id: employeeUserId }, ['role']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    if (user.role?.name !== UserRole.EMPLOYEE) {
      throw new BusinessException({
        code: 'EMP_003',
        message: 'User is not an employee.',
        statusCode: 400,
      });
    }

    // Lock the row inside a transaction so concurrent top-ups don't clobber each
    // other's point increments (lost-update fix).
    const transactionId = await CommonUtils.generateUniqueRefCode();

    const newPoints = await this.transactionService.runInTransaction(async (queryRunner) => {
      const lockedUser = await this.userRepository.findByIdForUpdate(user.id, queryRunner);

      if (!lockedUser) {
        throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
      }

      const updatedPoints = Number(lockedUser.points) + dto.points;

      await this.userRepository.updateById(
        lockedUser.id,
        {
          points: BigInt(updatedPoints),
        },
        queryRunner
      );

      await this.pointHistoryRepository.save(
        {
          user: { id: lockedUser.id } as any,
          points: dto.points,
          description: dto.description ?? 'Manual top-up',
          type: 'earn' as any,
          status: PointStatusEnum.added,
          date: new Date(),
          user_remaining_points: updatedPoints,
          taxable_points: 0,
          tds_points: 0,
          transaction_id: transactionId,
        },
        queryRunner
      );

      return updatedPoints;
    });

    return {
      userId: Number(user.id),
      mobile: user.mobile,
      pointsAdded: dto.points,
      totalPoints: newPoints,
    };
  }

  /**
   * List all employees with pagination.
   */
  async listEmployees(page: number = 1, limit: number = 10) {
    const employeeRole = await this.roleRepository.findByName(UserRole.EMPLOYEE);
    if (!employeeRole)
      return { employees: [], pagination: { total: 0, page, limit, totalPages: 0 } };

    const [employees, total] = await this.userRepository.getRepository().findAndCount({
      where: { role: { id: employeeRole.id } as any },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      employees: employees.map((e) => ({
        id: e.id,
        name: e.username ?? null,
        mobile: e.mobile ?? null,
        email: e.email ?? null,
        code: e.code ?? null,
        status: e.status,
        points: Number(e.points),
        createdAt: e.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Single employee detail with point history.
   */
  async getEmployee(employeeUserId: number) {
    const user = await this.userRepository.findOne({ id: employeeUserId }, ['role']);

    if (!user || user.role?.name !== UserRole.EMPLOYEE) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const history = await this.pointHistoryRepository.getRepository().find({
      where: { user: { id: employeeUserId } as any },
      order: { createdAt: 'DESC' } as any,
      take: 20,
    });

    return {
      id: user.id,
      name: user.username ?? null,
      mobile: user.mobile ?? null,
      email: user.email ?? null,
      code: user.code ?? null,
      status: user.status,
      points: Number(user.points),
      createdAt: user.createdAt,
      recentHistory: history.map((h) => ({
        id: h.id,
        points: h.points,
        type: h.type,
        status: h.status,
        description: h.description,
        date: h.date,
        remainingPoints: h.user_remaining_points,
      })),
    };
  }
}
