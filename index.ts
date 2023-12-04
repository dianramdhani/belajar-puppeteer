import 'dotenv/config'
import puppeteer, { Page } from 'puppeteer'

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  })
  const [page] = await browser.pages()
  const { URL, EMAIL, PASSWORD, URL_PRODUCT, URL_CART } = process.env

  try {
    await page.goto(URL ?? '')
    await login(page, EMAIL ?? '', PASSWORD ?? '')
    await page.reload()
    await addProductToCart(page, URL_PRODUCT ?? '')
    await goToCart(page, URL_CART ?? '')
  } catch (error) {
    console.error(error)
  }
}
main()

async function goToCart(page: Page, URL_CART: string) {
  await page.goto(URL_CART)
  const buttonLanjutkan = await page.$('[data-testid="cart-btn-summary-cta"]')
  await buttonLanjutkan?.click()
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
        const buttonNantiSaja = await page.waitForSelector(
          '#desktopBannerWrapped button',
          { timeout: 10000 }
        )
        await buttonNantiSaja?.click()
      })(),
    ])
    console.info('clean banner')
  } catch (error) {
    throw error
  }

  try {
    await Promise.all([
      (async () => {
        const buttonLogin = await page.$('#login-button')
        await buttonLogin?.click()
      })(),
      (async () => {
        const modalLogin = await page.waitForSelector(
          '[data-testid="login-form"]',
          { timeout: 5000 }
        )
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
