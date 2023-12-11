import 'dotenv/config'
import Processor from './processor'
import { CronJob } from 'cron'

const {
  ENV,
  BROWSER_TYPE,
  URL,
  URL_CART,
  URL_QUERY,
  URL_PRODUCTS,
  EMAILS,
  PASSWORD,
  TIME_LOGIN,
  TIME_PAYMENT,
  CART_STATUS,
} = process.env
const emails = (EMAILS ?? '').split(' ')
const urlProducts = (URL_PRODUCTS ?? '').split(' ')
const isProd = ENV === 'prod'

const jobLogin = CronJob.from({
  cronTime: TIME_LOGIN ?? '',
  onTick: () => main(),
  timeZone: 'Asia/Jakarta',
})
if (isProd) {
  console.info('ini prod bersiaplah')
  jobLogin.start()
} else {
  console.log('tenang masih dev', { CART_STATUS })
  main()
}

function main() {
  urlProducts.forEach(async (urlProduct, index) => {
    const processor = new Processor(emails[index].split('@')[0], isProd)
    const jobPayment = CronJob.from({
      cronTime: TIME_PAYMENT ?? '',
      onTick: () => processor.checkOut(),
      timeZone: 'Asia/Jakarta',
    })

    try {
      await processor.initialize(BROWSER_TYPE ?? '')
      await processor.login(
        URL ?? '',
        URL_QUERY ?? '',
        emails[index],
        PASSWORD ?? ''
      )

      if (!isProd && CART_STATUS === 'clear') {
        await processor.clearCart(URL_CART ?? '')
      } else {
        await processor.addProductToCart(urlProduct)
        await processor.prepareCheckOut()
        isProd
          ? jobPayment.start()
          : await (async () => {
              await new Promise((resolve) => setTimeout(resolve, 5000))
              await processor.checkOut()
            })()
        !isProd && (await processor.clearCart(URL_CART ?? ''))
      }
    } catch (error) {
      console.error(error)
    }
  })
}
