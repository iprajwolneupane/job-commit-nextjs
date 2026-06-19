import 'dotenv/config'
import { ScrapeStatus } from '@/generated/prisma/enums'
import { prisma } from '@/lib/prisma'
import { scrapeJobReportFromLink } from '@/lib/service'
import cron from 'node-cron'

const RETRY_PLATFORMS = ['LinkedIn']
const MAX_SCRAPE_ATTEMPTS = 3

let isRunning = false

async function retryJobScraping() {
  if (isRunning) {
    console.log('Cron already running. Skipping this run.')
    return
  }

  isRunning = true
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  console.log('Starting job scraping retry...')

  try {
    const jobsToRetry = await prisma.appliedJob.findMany({
      where: {
        platform: {
          name: {
            in: RETRY_PLATFORMS,
          },
        },
        scrappedJob: {
          is: {
            scrapeStatus: {
              in: [ScrapeStatus.PENDING, ScrapeStatus.FAILED],
            },
            scrapeAttempts: {
              lt: MAX_SCRAPE_ATTEMPTS,
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
        },
      },
      take: 10,
      orderBy: {
        appliedDate: 'asc',
      },
    })

    console.log(`Found ${jobsToRetry.length} jobs to retry.`)

    for (const job of jobsToRetry) {
      try {
        console.log(`Scraping job: ${job.id}`)

        await prisma.scrappedJob.update({
          where: {
            appliedJobId: job.id,
          },
          data: {
            scrapeStatus: ScrapeStatus.SCRAPING,
            lastScrapeAttemptAt: new Date(),
          },
        })

        const scraped = await scrapeJobReportFromLink(job.link)

        if (scraped) {
          await prisma.scrappedJob.update({
            where: {
              appliedJobId: job.id,
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
              company: job.company,
              title: scraped.title,
            },
          })
        } else {
          await prisma.scrappedJob.update({
            where: {
              appliedJobId: job.id,
            },
            data: {
              scrapeStatus: ScrapeStatus.FAILED,
              scrapeError: 'Got no scraped data',
              scrapeAttempts: {
                increment: 1,
              },
              lastScrapeAttemptAt: new Date(),
            },
          })
        }

        console.log(`Scraping completed for job: ${job.id}`)
      } catch (error) {
        console.error(`Scraping failed for job: ${job.id}`, error)

        await prisma.scrappedJob.update({
          where: {
            appliedJobId: job.id,
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
    }
  } catch (error) {
    console.error('Cron job failed:', error)
  } finally {
    isRunning = false
    console.log('10-minute job scraping retry finished.')
  }
}

cron.schedule('*/10 * * * *', async () => {
  await retryJobScraping()
})

console.log('Job scraping cron started. Runs every 10 minutes.')

void retryJobScraping()
