/**
 * Simple in-memory job queue for background tasks like label generation
 * Jobs are processed asynchronously and status can be polled
 */

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  result?: R;
  error?: string;
  progress?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

type JobHandler<T, R> = (job: Job<T, R>) => Promise<R>;

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler<any, any>> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private cleanupIntervalMs: number = 60000; // Clean up old jobs every minute
  private jobTTLMs: number = 3600000; // Keep jobs for 1 hour

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  /**
   * Register a handler for a job type
   */
  registerHandler<T, R>(type: string, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T, R>(type: string, data: T): Promise<Job<T, R>> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job<T, R> = {
      id,
      type,
      data,
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    
    // Start processing immediately if we have capacity
    this.processNext();
    
    return job;
  }

  /**
   * Get job status
   */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs of a certain type
   */
  getJobsByType(type: string): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.type === type);
  }

  /**
   * Process next pending job
   */
  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    const pendingJob = Array.from(this.jobs.values()).find(
      j => j.status === 'pending' && !this.processing.has(j.id)
    );

    if (!pendingJob) {
      return;
    }

    const handler = this.handlers.get(pendingJob.type);
    if (!handler) {
      pendingJob.status = 'failed';
      pendingJob.error = `No handler registered for job type: ${pendingJob.type}`;
      return;
    }

    this.processing.add(pendingJob.id);
    pendingJob.status = 'processing';
    pendingJob.startedAt = new Date();

    try {
      const result = await handler(pendingJob);
      pendingJob.status = 'completed';
      pendingJob.result = result;
      pendingJob.completedAt = new Date();
    } catch (error: any) {
      pendingJob.status = 'failed';
      pendingJob.error = error.message || 'Unknown error';
      pendingJob.completedAt = new Date();
      console.error(`[JobQueue] Job ${pendingJob.id} failed:`, error.message);
    } finally {
      this.processing.delete(pendingJob.id);
      // Try to process more jobs
      this.processNext();
    }
  }

  /**
   * Update job progress (0-100)
   */
  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.jobs.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, job] = entries[i];
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        now - job.completedAt.getTime() > this.jobTTLMs
      ) {
        this.jobs.delete(id);
      }
    }
  }

  /**
   * Cancel a pending job
   */
  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get queue stats
   */
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Job types
export const JOB_TYPES = {
  PPL_LABEL_GENERATION: 'ppl_label_generation',
  EMAIL_SEND: 'email_send',
} as const;
