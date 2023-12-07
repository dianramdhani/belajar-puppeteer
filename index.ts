import 'dotenv/config'
import puppeteer from 'puppeteer'
import { CronJob } from 'cron'
import {
  addProductToCart,
  checkOut,
  clearCart,
  login,
  prepareCheckout,
} from './core'

const { URL, PASSWORD, TIME_PAYMENT, URL_PAYMENT, URL_CART, CART_STATUS } =
  process.env
const emails = (process.env['EMAILS'] ?? '').split(' ')
const urlProducts = (process.env['URL_PRODUCTS'] ?? '').split(' ')
const isProd = process.env['ENV'] === 'prod'
const jobLogin = new CronJob(process.env['TIME_LOGIN'] ?? '', main)
isProd ? jobLogin.start() : main()

function main() {
  urlProducts.forEach(async (urlProduct, index) => {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    })
    const [page] = await browser.pages()
    const jobPayment = new CronJob(TIME_PAYMENT ?? '', () => {
      checkOut(page, URL_PAYMENT ?? '')
    })

    try {
      await page.goto(URL ?? '')
    } catch (error) {}

    try {
      await login(page, emails[index], PASSWORD ?? '')

      if (!isProd && CART_STATUS === 'clear') {
        await clearCart(page, URL_CART ?? '')
      } else {
        await addProductToCart(page, urlProduct)
        await prepareCheckout(page, URL_CART ?? '')
        isProd ? jobPayment.start() : checkOut(page, URL_PAYMENT ?? '')
      }
    } catch (error) {
      console.warn(`ada error ${emails[index]}`, error)
    }
  })
}
