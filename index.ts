import { CronJob } from 'cron'
import 'dotenv/config'
import puppeteer, { Page } from 'puppeteer'

const ENV = process.env['ENV'] ?? 'dev'
const jobLogin = new CronJob(process.env['TIME_LOGIN'] ?? '', main)
ENV === 'prod' ? jobLogin.start() : main()

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  })
  const [page] = await browser.pages()
  const { URL, EMAIL, PASSWORD, TIME_PAYMENT, URL_CART, URL_PAYMENT } =
    process.env
  const jobPayment = new CronJob(TIME_PAYMENT ?? '', () =>
    checkOut(page, URL_PAYMENT ?? '')
  )

  try {
    await page.goto(URL ?? '')
    await login(page, EMAIL ?? '', PASSWORD ?? '')
    await page.waitForNavigation()
    await page.goto(URL_CART ?? '')
    await deleteBanner(page)
    jobPayment.start()
  } catch (error) {
    console.warn('ada error gatau apa', error)
  }
}

async function deleteBanner(page: Page) {
  try {
    await page.waitForSelector('[id^="moe-onsite-campaign-"]')
    const banner = await page.$('[id^="moe-onsite-campaign-"]')
    await banner?.evaluateHandle((el) => el.remove())
    console.info('delete welcome banner')
  } catch (error) {
    console.warn('delete welcome banner gagal')
  }
}

async function checkOut(page: Page, URL_PAYMENT: string) {
  try {
    const buttonLanjutkan = await page.$('[data-testid="cart-btn-summary-cta"]')
    await buttonLanjutkan?.click()
    await page.waitForNavigation()
    await page.goto(URL_PAYMENT)
    const buttonVA = await page.$('div ::-p-text(Virtual Account)')
    await buttonVA?.click()
    const buttonOrder = await page.$('div ::-p-text(order sekarang)')
    ENV === 'prod' && (await buttonOrder?.click())
    console.info('berhasil checkout')
  } catch (error) {
    throw error
  }
}

async function addProductToCart(page: Page, URL_PRODUCT: string) {
  await page.goto(URL_PRODUCT)
  const buttonAddCart = await page.$('#btn-add-to-cart')
  await buttonAddCart?.click()
}

async function login(page: Page, email: string, password: string) {
  try {
    await Promise.all([
      (async () => {
        const buttonOKLogin = await page.$('#driver-popover-item button')
        await buttonOKLogin?.click()
      })(),
      (async () => {
        await page.waitForSelector('#desktopBannerWrapped button')
        const buttonNantiSaja = await page.$('#desktopBannerWrapped button')
        await buttonNantiSaja?.click()
      })(),
    ])
    console.info('clean banner')
  } catch (error) {
    console.warn('gagal clean banner')
  }

  try {
    await Promise.all([
      (async () => {
        const buttonLogin = await page.$('#login-button')
        await buttonLogin?.click()
      })(),
      (async () => {
        await page.waitForSelector('[data-testid="login-form"]')
        const modalLogin = await page.$('[data-testid="login-form"]')
        if (modalLogin) {
          const inputName = await modalLogin.$('[name="username"]')
          await inputName?.type(email)

          const [inputPassword, checkRemember, buttonLogin] = await Promise.all(
            [
              modalLogin.$('[name="password"]'),
              modalLogin.$('#remember-me'),
              modalLogin.$('form button'),
            ]
          )
          await inputPassword?.type(password)
          await checkRemember?.click()
          await buttonLogin?.click()
        }
      })(),
    ])
    console.info('login success')
  } catch (error) {
    console.warn('gagal login')
    throw error
  }
}
