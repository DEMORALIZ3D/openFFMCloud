import { Queue, QueueEvents } from 'bullmq';

// Ensure Redis connection settings are robust
export const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// The actual queue instance for adding jobs
export const renderQueue = new Queue('renderQueue', { 
    connection,
    defaultJobOptions: {
        attempts: 1, // Don't retry renders immediately if they fail (usually syntax error)
        removeOnComplete: 100, // Keep last 100 jobs
        removeOnFail: 200
    }
});

// Events listener (needed for job.waitUntilFinished in server)
export const queueEvents = new QueueEvents('renderQueue', { connection });