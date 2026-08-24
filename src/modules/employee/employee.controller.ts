import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { IngestEmployeeDto, TopupPointsDto } from './dto/employee.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { BusinessException } from 'src/default/error/business.exception';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  /**
   * fashion sends employee data here — single or batch.
   *
   * Single:  { "employee": { "name": "...", "mobile": "...", "points": 100 } }
   * Batch:   { "employees": [{ ... }, { ... }] }
   */
  @Post('ingest')
  @NoCache()
  @ResponseMessage('Employee data ingested successfully')
  async ingest(@Body() dto: IngestEmployeeDto) {
    // Normalise to always work with an array
    let employees = dto.employees ?? [];
    if (dto.employee) employees = [dto.employee, ...employees];

    if (employees.length === 0) {
      throw new BusinessException({
        code: 'EMP_004',
        message: 'No employee data provided. Send either "employee" or "employees" field.',
        statusCode: 400,
      });
    }

    const response = await this.employeeService.ingest(employees);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Explicit top-up for an existing employee.
   * POST /employee/:id/topup
   */
  @Post(':id/topup')
  @NoCache()
  @ResponseMessage('Points topped up successfully')
  async topup(@Param('id') id: string, @Body() dto: TopupPointsDto) {
    const response = await this.employeeService.topupById(Number(id), dto);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * List all employees with pagination.
   * GET /employee?page=1&limit=10
   */
  @Get()
  @NoCache()
  @ResponseMessage('Employees fetched successfully')
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    const response = await this.employeeService.listEmployees(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Single employee detail + recent point history.
   * GET /employee/:id
   */
  @Get(':id')
  @NoCache()
  @ResponseMessage('Employee fetched successfully')
  async getOne(@Param('id') id: string) {
    const response = await this.employeeService.getEmployee(Number(id));
    return DataSanitizer.sanitizeData(response);
  }
}
