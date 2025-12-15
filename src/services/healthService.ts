import { injectable, inject } from 'inversify';
import { DataSource } from 'typeorm';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';

type ServiceStatus = 'healthy' | 'unhealthy';

type DependencyHealth = {
  status: ServiceStatus;
  message?: string;
};

export type HealthStatus = {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  dependencies: {
    database: DependencyHealth;
  };
};

export interface IHealthService {
  getHealth(): Promise<HealthStatus>;
}

@injectable()
export class HealthService implements IHealthService {
  constructor(
    @inject(TYPES.DataSource) private dataSource: DataSource,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const databaseHealth = await this.checkDatabase();

    const overallStatus: ServiceStatus = 
      databaseHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: databaseHealth,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Database not initialized',
        };
      }

      await this.dataSource.query('SELECT 1');
      
      return {
        status: 'healthy',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

