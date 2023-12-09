import 'dotenv/config'
import Processor from './processor'
import { CronJob } from 'cron'

const {
  BROWSER_TYPE,
  URL,
  URL_CART,
  URL_PAYMENT,
  PASSWORD,
  TIME_PAYMENT,
  CART_STATUS,
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
    const processor = new Processor(emails[index].split('@')[0])
    const jobPayment = CronJob.from({
      cronTime: TIME_PAYMENT ?? '',
      onTick: () => processor.checkOut(URL_PAYMENT ?? ''),
      timeZone: 'Asia/Jakarta',
    })

    try {
      await processor.initialize(BROWSER_TYPE ?? '')
      await processor.login(URL ?? '', emails[index], PASSWORD ?? '')

      if (!isProd && CART_STATUS === 'clear') {
        await processor.clearCart(URL_CART ?? '')
      } else {
        await processor.addProductToCart(urlProduct)
        await processor.prepareCheckout(URL_CART ?? '')
        isProd
          ? jobPayment.start()
          : await processor.checkOut(URL_PAYMENT ?? '')
        !isProd && await processor.clearCart(URL_CART ?? '')
      }
    } catch (error) {
      console.error(error)
    }
  })
}
