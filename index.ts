import 'dotenv/config'
import puppeteer from 'puppeteer'
import { CronJob } from 'cron'
import { addProductToCart, checkOut, login, prepareCheckout } from './core'

const {
  URL,
  EMAIL,
  PASSWORD,
  TIME_PAYMENT,
  URL_CART,
  URL_PAYMENT,
  URL_PRODUCT,
} = process.env
const isProd = process.env['ENV'] === 'prod'
const jobLogin = new CronJob(process.env['TIME_LOGIN'] ?? '', main)
isProd ? jobLogin.start() : main()

async function main() {
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
    await login(page, EMAIL ?? '', PASSWORD ?? '')
    await addProductToCart(page, URL_PRODUCT ?? '')
    await prepareCheckout(page, URL_CART ?? '')
    isProd ? jobPayment.start() : checkOut(page, URL_PAYMENT ?? '')
  } catch (error) {
    console.warn('ada error gatau apa', error)
  }
}
