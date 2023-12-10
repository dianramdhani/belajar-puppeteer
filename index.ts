import 'dotenv/config'
import Processor from './processor'
import { CronJob } from 'cron'

const {
  BROWSER_TYPE,
  URL,
  URL_CART,
  URL_QUERY,
  PASSWORD,
  TIME_PAYMENT,
  CART_STATUS,
  LIMIT_PRICE,
} = process.env
const emails = (process.env['EMAILS'] ?? '').split(' ')
const urlProducts = (process.env['URL_PRODUCTS'] ?? '').split(' ')
const isProd = process.env['ENV'] === 'prod'

const jobLogin = CronJob.from({
  cronTime: process.env['TIME_LOGIN'] ?? '',
  onTick: main,
  timeZone: 'Asia/Jakarta',
})
isProd ? jobLogin.start() : main()

function main() {
  urlProducts.forEach(async (urlProduct, index) => {
    const processor = new Processor(emails[index].split('@')[0], isProd)
    const jobPayment = CronJob.from({
      cronTime: TIME_PAYMENT ?? '',
      onTick: () =>
        processor.checkOut(URL_QUERY ?? '', LIMIT_PRICE ? +LIMIT_PRICE : 50000),
      timeZone: 'Asia/Jakarta',
    })

    try {
      await processor.initialize(BROWSER_TYPE ?? '')
      await processor.login(URL ?? '', emails[index], PASSWORD ?? '')

      if (!isProd && CART_STATUS === 'clear') {
        await processor.clearCart(URL_CART ?? '')
      } else {
        await processor.addProductToCart(urlProduct)
        isProd
          ? jobPayment.start()
          : await (async () => {
              await new Promise((resolve) => setTimeout(resolve, 5000))
              await processor.checkOut(
                URL_QUERY ?? '',
                LIMIT_PRICE ? +LIMIT_PRICE : 50000
              )
            })()
        !isProd && (await processor.clearCart(URL_CART ?? ''))
      }
    } catch (error) {
      console.error(error)
    }
  })
}
