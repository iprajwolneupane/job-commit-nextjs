import 'dotenv/config'
import { Worker, type ConnectionOptions } from 'bullmq'
import { ScrapeStatus } from '@/generated/prisma/enums'
import { prisma } from '@/lib/prisma'
import { closeRedisConnection, getRedisConnection } from '@/lib/redis'
import {
  isSupportedScrapePlatform,
  scrapeJobReportFromLink,
  UNSUPPORTED_JOB_LINK_ERROR,
} from '@/lib/service'

const SCRAPE_JOB_QUEUE_NAME = 'scrape-job'
const WORKER_CONCURRENCY = 3

type ScrapeJobPayload = {
  jobId: string
}

async function markScrapeFailed(jobId: string, error: unknown) {
  await prisma.scrappedJob.update({
    where: {
      appliedJobId: jobId,
    },
    data: {
      scrapeStatus: ScrapeStatus.FAILED,
      scrapeError:
        error instanceof Error ? error.message : 'Unknown scrape error',
      scrapeAttempts: {
        increment: 1,
      },
      lastScrapeAttemptAt: new Date(),
    },
  })
}

const worker = new Worker<ScrapeJobPayload>(
  SCRAPE_JOB_QUEUE_NAME,
  async (queueJob) => {
    const { jobId } = queueJob.data

    console.log(`Scraping job ${jobId}`)

    const appliedJob = await prisma.appliedJob.findUnique({
      where: { 
        id: jobId,
      },
      select: {
        id: true,
        company: true,
        link: true,
        platform: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!appliedJob) {
      console.log(`Applied job not found. Skipping scrape job ${jobId}.`)
      return
    }

    if (!isSupportedScrapePlatform(appliedJob.platform.name)) {
      await prisma.scrappedJob.upsert({
        where: {
          appliedJobId: appliedJob.id,
        },
        create: {
          appliedJobId: appliedJob.id,
          link: appliedJob.link,
          scrapeStatus: ScrapeStatus.SKIPPED,
          scrapeError: UNSUPPORTED_JOB_LINK_ERROR,
        },
        update: {
          link: appliedJob.link,
          scrapeStatus: ScrapeStatus.SKIPPED,
          scrapeError: UNSUPPORTED_JOB_LINK_ERROR,
        },
      })

      console.log(`Skipped unsupported platform scrape job ${jobId}.`)
      return
    }

    await prisma.scrappedJob.upsert({
      where: {
        appliedJobId: appliedJob.id,
      },
      create: {
        appliedJobId: appliedJob.id,
        link: appliedJob.link,
        scrapeStatus: ScrapeStatus.SCRAPING,
        lastScrapeAttemptAt: new Date(),
      },
      update: {
        link: appliedJob.link,
        scrapeStatus: ScrapeStatus.SCRAPING,
        scrapeError: null,
        lastScrapeAttemptAt: new Date(),
      },
    })

    try {
      const scraped = await scrapeJobReportFromLink(appliedJob.link)

      if (!scraped) {
        await markScrapeFailed(appliedJob.id, new Error('Got no scraped data'))
        return
      }

      await prisma.scrappedJob.update({
        where: {
          appliedJobId: appliedJob.id,
        },
        data: {
          scrapeStatus: ScrapeStatus.COMPLETED,
          scrapedLink: scraped.link,
          scrapedAt: new Date(),
          scrapeError: null,
          scrapeAttempts: {
            increment: 1,
          },
          description: scraped.description,
          company: appliedJob.company,
          title: scraped.title,
        },
      })

      console.log(`Scraping completed for job ${jobId}.`)
    } catch (error) {
      await markScrapeFailed(appliedJob.id, error)
      console.error(`Scraping failed for job ${jobId}.`, error)
    }
  },
  {
    connection: getRedisConnection() as ConnectionOptions,
    concurrency: WORKER_CONCURRENCY,
  },
)

worker.on('completed', (job) => {
  console.log(`Scrape queue job completed: ${job.id}`)
})

worker.on('failed', (job, error) => {
  console.error(`Scrape queue job failed: ${job?.id}`, error)
})

worker.on('error', (error) => {
  console.error('Scrape worker error:', error)
})

async function shutdown() {
  console.log('Closing scrape worker...')
  await worker.close()
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

console.log('Scrape job worker started.')
