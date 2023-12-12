import 'dotenv/config'
import Processor from './processor'
import { CronJob } from 'cron'

const { ENV, URL, URL_QUERY, URL_LIST_CO, TIME_PAYMENT, BROWSER_COUNT } =
  process.env
const isProd = ENV === 'prod'
main()

function main() {
  ;[...new Array(+(BROWSER_COUNT ?? 0))].forEach(async () => {
    const processor = new Processor(isProd)
    const jobPayment = CronJob.from({
      cronTime: TIME_PAYMENT ?? '',
      onTick: () => processor.checkOut(URL_LIST_CO ?? ''),
      timeZone: 'Asia/Jakarta',
    })

    try {
      await processor.initialize(URL ?? '', URL_QUERY ?? '')

      if (isProd) {
        console.info('ini prod bersiaplah')
        jobPayment.start()
      } else {
        console.info('tenang masih dev')
        await processor.checkOut(URL_LIST_CO ?? '')
      }
    } catch (error) {
      console.error(error)
    }
  })
}
