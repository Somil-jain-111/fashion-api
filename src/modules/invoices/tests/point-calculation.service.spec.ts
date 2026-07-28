import { PointCalculationService } from '../services';
import { InvoiceEntity } from '../entities/invoice.entity';

describe('PointCalculationService', () => {
  const service = new PointCalculationService();

  it('awards proportional points without re-awarding previously earned points', () => {
    const invoice = {
      total_pairs: 100,
      allocated_points: 1000,
      earned_points: 300,
    } as InvoiceEntity;
    expect(service.calculate(invoice, 50)).toBe(200);
  });

  it('awards the exact remaining balance on completion', () => {
    const invoice = {
      total_pairs: 3,
      allocated_points: 100,
      earned_points: 66,
    } as InvoiceEntity;
    expect(service.calculate(invoice, 3)).toBe(34);
  });

  it('does not award negative points', () => {
    const invoice = {
      total_pairs: 10,
      allocated_points: 100,
      earned_points: 100,
    } as InvoiceEntity;
    expect(service.calculate(invoice, 5)).toBe(0);
  });
});
