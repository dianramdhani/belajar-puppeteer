import 'dotenv/config'
import Processor from './processor'
import { CronJob } from 'cron'

const { URL, PASSWORD, TIME_PAYMENT, URL_CART, CART_STATUS } = process.env
const emails = (process.env['EMAILS'] ?? '').split(' ')
const urlProducts = (process.env['URL_PRODUCTS'] ?? '').split(' ')
const isProd = process.env['ENV'] === 'prod'

const jobLogin = new CronJob(process.env['TIME_LOGIN'] ?? '', main)
isProd ? jobLogin.start() : main()

function main() {
  urlProducts.forEach(async (urlProduct, index) => {
    const processor = new Processor(emails[index].split('@')[0])
    await processor.initialize()
    const jobPayment = new CronJob(TIME_PAYMENT ?? '', processor.checkOut)

    try {
      await processor.login(URL ?? '', emails[index], PASSWORD ?? '')

      if (!isProd && CART_STATUS === 'clear') {
        await processor.clearCart(URL_CART ?? '')
      } else {
        await processor.addProductToCart(urlProduct)
        isProd ? jobPayment.start() : await processor.checkOut()
      }
    } catch (error) {
      console.error(error)
    }
  })
}
