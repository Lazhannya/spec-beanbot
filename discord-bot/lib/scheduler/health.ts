/**
 * System health monitoring for the delivery scheduler
 * Monitors delivery queue, cron jobs, and KV operations
 */

import { Result } from "../utils/result.ts";
import { logger } from "../utils/logger.ts";
import { DeliveryQueue } from "./queue.ts";
import type { 
  SystemHealthStatus, 
  ComponentHealth, 
  HealthStatus, 
  QueueStats,
  DeliveryMetrics 
} from "../../types/delivery.ts";

export interface HealthCheckConfig {
  checkInterval: number;        // Health check frequency (ms)
  timeout: number;             // Individual check timeout (ms)
  degradedThresholds: {
    queueSize: number;         // Queue size threshold for degraded status
    errorRate: number;         // Error rate % threshold for degraded status
    responseTime: number;      // Response time ms threshold for degraded status
  };
  unhealthyThresholds: {
    queueSize: number;         // Queue size threshold for unhealthy status
    errorRate: number;         // Error rate % threshold for unhealthy status
    responseTime: number;      // Response time ms threshold for unhealthy status
  };
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  checkInterval: 30000,        // 30 seconds
  timeout: 5000,              // 5 seconds
  degradedThresholds: {
    queueSize: 100,            // 100+ items = degraded
    errorRate: 10,             // 10%+ errors = degraded
    responseTime: 1000         // 1s+ response = degraded
  },
  unhealthyThresholds: {
    queueSize: 500,            // 500+ items = unhealthy
    errorRate: 25,             // 25%+ errors = unhealthy
    responseTime: 5000         // 5s+ response = unhealthy
  }
};

/**
 * Health monitoring service for delivery system
 */
export class DeliveryHealthMonitor {
  private config: HealthCheckConfig;
  private isRunning = false;
  private healthCheckInterval?: number;
  private lastHealthStatus?: SystemHealthStatus;
  private startTime = new Date();

  constructor(
    private kv: Deno.Kv,
    private deliveryQueue: DeliveryQueue,
    config?: Partial<HealthCheckConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start continuous health monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Health monitor already running", { operation: "health_monitor_start" });
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    
    logger.info("Starting delivery system health monitor", {
      operation: "health_monitor_start",
      context: {
        checkInterval: this.config.checkInterval,
        timeout: this.config.timeout
      }
    });

    // Run initial health check
    this.performHealthCheck().catch(error => {
      logger.error("Initial health check failed", {
        operation: "health_monitor_start",
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    });

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error("Scheduled health check failed", {
          operation: "health_monitor_check",
          error: {
            name: error instanceof Error ? error.name : "UnknownError",
            message: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.healthCheckInterval !== undefined) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    logger.info("Stopped delivery system health monitor", {
      operation: "health_monitor_stop"
    });
  }

  /**
   * Get current health status
   */
  async getCurrentHealth(): Promise<Result<SystemHealthStatus, Error>> {
    try {
      if (this.lastHealthStatus) {
        return { success: true, data: this.lastHealthStatus };
      }

      // If no cached status, perform immediate check
      return await this.performHealthCheck();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { 
        success: false, 
        error: new Error(`Failed to get current health: ${errorMsg}`) 
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<Result<SystemHealthStatus, Error>> {
    const checkStartTime = performance.now();
    
    try {
      logger.debug("Performing system health check", { operation: "health_check" });

      const components: ComponentHealth[] = [];

      // Check KV database health
      const kvHealth = await this.checkKVHealth();
      components.push(kvHealth);

      // Check delivery queue health
      const queueHealth = await this.checkDeliveryQueueHealth();
      components.push(queueHealth);

      // Check cron job health (if monitoring is available)
      const cronHealth = await this.checkCronHealth();
      components.push(cronHealth);

      // Determine overall health status
      const overallStatus = this.calculateOverallHealth(components);
      
      const healthStatus: SystemHealthStatus = {
        overall: overallStatus,
        components,
        lastUpdated: new Date(),
        uptime: Date.now() - this.startTime.getTime()
      };

      // Cache the status
      this.lastHealthStatus = healthStatus;

      // Log health status changes
      if (this.lastHealthStatus?.overall !== overallStatus) {
        logger.info("Health status changed", {
          operation: "health_check",
          context: {
            previousStatus: this.lastHealthStatus?.overall,
            newStatus: overallStatus,
            checkDuration: performance.now() - checkStartTime
          }
        });
      }

      return { success: true, data: healthStatus };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Health check failed", {
        operation: "health_check",
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: errorMsg,
          duration: performance.now() - checkStartTime
        }
      });

      return { success: false, error: new Error(`Health check failed: ${errorMsg}`) };
    }
  }

  /**
   * Check KV database health
   */
  private async checkKVHealth(): Promise<ComponentHealth> {
    const checkStartTime = performance.now();
    
    try {
      // Test KV connectivity with a simple read/write
      const testKey = ["health_check", "test", Date.now()];
      const testValue = { timestamp: new Date() };
      
      await this.kv.set(testKey, testValue);
      const result = await this.kv.get(testKey);
      await this.kv.delete(testKey);
      
      const responseTime = performance.now() - checkStartTime;
      
      if (!result.value) {
        return {
          name: "kv_database",
          status: HealthStatus.UNHEALTHY,
          message: "KV read/write test failed",
          lastCheck: new Date(),
          metrics: { responseTime }
        };
      }

      // Determine status based on response time
      let status = HealthStatus.HEALTHY;
      if (responseTime > this.config.unhealthyThresholds.responseTime) {
        status = HealthStatus.UNHEALTHY;
      } else if (responseTime > this.config.degradedThresholds.responseTime) {
        status = HealthStatus.DEGRADED;
      }

      return {
        name: "kv_database",
        status,
        message: status === HealthStatus.HEALTHY ? "KV operations normal" : 
                status === HealthStatus.DEGRADED ? "KV operations slow" : "KV operations very slow",
        lastCheck: new Date(),
        metrics: { responseTime, testSuccess: 1 }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        name: "kv_database", 
        status: HealthStatus.UNHEALTHY,
        message: `KV error: ${errorMsg}`,
        lastCheck: new Date(),
        metrics: { responseTime: performance.now() - checkStartTime, testSuccess: 0 }
      };
    }
  }

  /**
   * Check delivery queue health
   */
  private async checkDeliveryQueueHealth(): Promise<ComponentHealth> {
    const checkStartTime = performance.now();
    
    try {
      const statsResult = await this.deliveryQueue.getQueueStats();
      const responseTime = performance.now() - checkStartTime;
      
      if (!statsResult.success) {
        return {
          name: "delivery_queue",
          status: HealthStatus.UNHEALTHY,
          message: `Queue stats error: ${statsResult.error.message}`,
          lastCheck: new Date(),
          metrics: { responseTime }
        };
      }

      const stats = statsResult.data;
      const totalQueued = stats.pending + stats.scheduled + stats.retrying;
      
      // Calculate error rate (failed / total processed)
      const totalProcessed = stats.delivered + stats.failed;
      const errorRate = totalProcessed > 0 ? (stats.failed / totalProcessed) * 100 : 0;

      // Determine status based on queue size and error rate
      let status = HealthStatus.HEALTHY;
      let message = "Queue operating normally";

      if (totalQueued > this.config.unhealthyThresholds.queueSize || 
          errorRate > this.config.unhealthyThresholds.errorRate) {
        status = HealthStatus.UNHEALTHY;
        message = `Queue overloaded: ${totalQueued} items, ${errorRate.toFixed(1)}% error rate`;
      } else if (totalQueued > this.config.degradedThresholds.queueSize || 
                 errorRate > this.config.degradedThresholds.errorRate) {
        status = HealthStatus.DEGRADED;
        message = `Queue stressed: ${totalQueued} items, ${errorRate.toFixed(1)}% error rate`;
      }

      return {
        name: "delivery_queue",
        status,
        message,
        lastCheck: new Date(),
        metrics: {
          responseTime,
          queueSize: totalQueued,
          errorRate,
          pending: stats.pending,
          scheduled: stats.scheduled,
          delivered: stats.delivered,
          failed: stats.failed,
          retrying: stats.retrying
        }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        name: "delivery_queue",
        status: HealthStatus.UNHEALTHY,
        message: `Queue check failed: ${errorMsg}`,
        lastCheck: new Date(),
        metrics: { responseTime: performance.now() - checkStartTime }
      };
    }
  }

  /**
   * Check cron job health (basic implementation)
   */
  private async checkCronHealth(): Promise<ComponentHealth> {
    try {
      // For now, we can't directly monitor Deno cron jobs
      // This is a placeholder for future cron monitoring implementation
      
      // We could check when the last cron execution occurred by looking at logs
      // or checking the last processed item timestamp in the queue
      
      return {
        name: "cron_jobs",
        status: HealthStatus.HEALTHY,
        message: "Cron monitoring not implemented",
        lastCheck: new Date(),
        metrics: { monitoring: 0 }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        name: "cron_jobs",
        status: HealthStatus.UNHEALTHY,
        message: `Cron check failed: ${errorMsg}`,
        lastCheck: new Date(),
        metrics: { monitoring: 0 }
      };
    }
  }

  /**
   * Calculate overall health from component health
   */
  private calculateOverallHealth(components: ComponentHealth[]): HealthStatus {
    if (components.length === 0) {
      return HealthStatus.UNHEALTHY;
    }

    // If any component is down/unhealthy, system is unhealthy
    if (components.some(c => c.status === HealthStatus.UNHEALTHY || c.status === HealthStatus.DOWN)) {
      return HealthStatus.UNHEALTHY;
    }

    // If any component is degraded, system is degraded
    if (components.some(c => c.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    // All components healthy
    return HealthStatus.HEALTHY;
  }

  /**
   * Get delivery system metrics
   */
  async getDeliveryMetrics(): Promise<Result<DeliveryMetrics, Error>> {
    try {
      const statsResult = await this.deliveryQueue.getQueueStats();
      if (!statsResult.success) {
        return { success: false, error: statsResult.error };
      }

      const stats = statsResult.data;
      const totalDeliveries = stats.delivered + stats.failed;
      const successfulDeliveries = stats.delivered;
      const failedDeliveries = stats.failed;

      const metrics: DeliveryMetrics = {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        averageDeliveryTime: 0,        // TODO: Implement timing tracking
        retryRate: totalDeliveries > 0 ? (stats.retrying / totalDeliveries) * 100 : 0,
        errorRate: totalDeliveries > 0 ? (failedDeliveries / totalDeliveries) * 100 : 0,
        timezoneAccuracy: 100          // TODO: Implement timezone accuracy tracking
      };

      return { success: true, data: metrics };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { 
        success: false, 
        error: new Error(`Failed to get delivery metrics: ${errorMsg}`) 
      };
    }
  }

  /**
   * Check if the system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const healthResult = await this.getCurrentHealth();
    if (!healthResult.success) {
      return false;
    }
    
    return healthResult.data.overall === HealthStatus.HEALTHY;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }
}