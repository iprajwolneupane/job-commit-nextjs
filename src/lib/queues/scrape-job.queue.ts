import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'

export type ScrapeJobPayload = {
  jobId: string
}

export const SCRAPE_JOB_QUEUE_NAME = 'scrape-job'
export const SCRAPE_JOB_NAME = 'scrape-job'

const defaultScrapeJobOptions: JobsOptions = {
  attempts: 1,
  removeOnComplete: true,
  removeOnFail: true,
}

let scrapeJobQueue: Queue<ScrapeJobPayload> | null = null

export function getScrapeJobQueue() {
  scrapeJobQueue ??= new Queue<ScrapeJobPayload>(SCRAPE_JOB_QUEUE_NAME, {
    connection: getRedisConnection() as ConnectionOptions,
    defaultJobOptions: defaultScrapeJobOptions,
  })

  return scrapeJobQueue
}

export function getScrapeJobQueueId(jobId: string) {
  return `${SCRAPE_JOB_NAME}-${jobId}`
}

export function enqueueScrapeJob(jobId: string) {
  return getScrapeJobQueue().add(
    SCRAPE_JOB_NAME,
    {
      jobId,
    },
    {
      jobId: getScrapeJobQueueId(jobId),
    },
  )
}

export async function closeScrapeJobQueue() {
  if (!scrapeJobQueue) return

  await scrapeJobQueue.close()
  scrapeJobQueue = null
}
