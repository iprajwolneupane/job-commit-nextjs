import 'dotenv/config'
import cron from 'node-cron'
import { ScrapeStatus } from '@/generated/prisma/enums'
import {
  closeScrapeJobQueue,
  enqueueScrapeJob,
} from '@/lib/queues/scrape-job.queue'
import { prisma } from '@/lib/prisma'
import { closeRedisConnection } from '@/lib/redis'

const RETRY_PLATFORMS = ['LinkedIn']
const MAX_SCRAPE_ATTEMPTS = 3
const JOBS_PER_RUN = 10

let isRunning = false

async function retryJobScraping() {
  if (isRunning) {
    console.log('Cron already running. Skipping this run.')
    return
  }

  isRunning = true
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  console.log('Starting job scraping retry enqueue...')

  try {
    const jobsToRetry = await prisma.appliedJob.findMany({
      where: {
        platform: {
          name: {
            in: RETRY_PLATFORMS,
          },
        },
        OR: [
          {
            scrappedJob: {
              is: null,
            },
          },
          {
            scrappedJob: {
              is: {
                scrapeAttempts: {
                  lt: MAX_SCRAPE_ATTEMPTS,
                },
                OR: [
                  {
                    scrapeStatus: {
                      in: [ScrapeStatus.PENDING, ScrapeStatus.FAILED],
                    },
                    OR: [
                      {
                        lastScrapeAttemptAt: null,
                      },
                      {
                        lastScrapeAttemptAt: {
                          lt: tenMinutesAgo,
                        },
                      },
                    ],
                  },
                  {
                    scrapeStatus: ScrapeStatus.SCRAPING,
                    lastScrapeAttemptAt: {
                      lt: tenMinutesAgo,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      take: JOBS_PER_RUN,
      orderBy: {
        appliedDate: 'asc',
      },
      select: {
        id: true,
      },
    })

    console.log(`Found ${jobsToRetry.length} jobs to enqueue.`)

    for (const job of jobsToRetry) {
      await enqueueScrapeJob(job.id)
      console.log(`Enqueued scrape job: ${job.id}`)
    }
  } catch (error) {
    console.error('Cron job failed:', error)
  } finally {
    isRunning = false
    console.log('10-minute job scraping enqueue finished.')
  }
}

cron.schedule('*/10 * * * *', async () => {
  await retryJobScraping()
})

async function shutdown() {
  console.log('Closing scraping retry cron...')
  await closeScrapeJobQueue()
  await closeRedisConnection()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})

console.log('Job scraping retry cron started. Runs every 10 minutes.')

void retryJobScraping()
