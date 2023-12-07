import 'dotenv/config'
import puppeteer from 'puppeteer'
import { CronJob } from 'cron'
import { addProductToCart, checkOut, login, prepareCheckout } from './core'

const { URL, PASSWORD, TIME_PAYMENT, URL_PAYMENT, URL_CART } = process.env
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
      await login(page, emails[index], PASSWORD ?? '')
      await addProductToCart(page, urlProduct)
      await prepareCheckout(page, URL_CART ?? '')
      isProd ? jobPayment.start() : checkOut(page, URL_PAYMENT ?? '')
    } catch (error) {
      console.warn('ada error gatau apa', error)
    }
  })
}
