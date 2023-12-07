import { Page } from 'puppeteer'

export async function login(page: Page, email: string, password: string) {
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
  } finally {
    await deleteBanner(page)
  }
}

export async function deleteBanner(page: Page) {
  try {
    await page.waitForSelector('[id^="moe-onsite-campaign-"]')
    const banner = await page.$('[id^="moe-onsite-campaign-"]')
    await banner?.evaluateHandle((el) => el.remove())
    console.info('delete welcome banner')
  } catch (error) {
    console.warn('delete welcome banner gagal')
  }
}

export async function addProductToCart(page: Page, urlProduct: string) {
  await page.goto(urlProduct)
  const buttonAddCart = await page.$('#btn-add-to-cart')
  await buttonAddCart?.click()
}

export async function prepareCheckout(page: Page, urlCart: string) {
  try {
    await page.goto(urlCart)
    const buttonLanjutkan = await page.$('[data-testid="cart-btn-summary-cta"]')
    await buttonLanjutkan?.click()
    await page.waitForNavigation()
    const buttonExpedition = await page.$(
      '[aria-label="Choose shipping method"]'
    )
    await buttonExpedition?.click()
    await page.waitForSelector(
      '[data-testid="shipping-method-dropdown"] p ::-p-text(JNE)'
    )
    const selectExpedition = await page?.$(
      '[data-testid="shipping-method-dropdown"] li:nth-child(3)'
    )
    await selectExpedition?.click()
    const buttonPilihPembayaran = await page.waitForSelector(
      'button:not(.btn-disabled) ::-p-text(Pilih Pembayaran)'
    )
    await buttonPilihPembayaran?.click()
    await page.waitForNavigation()
    console.info('berhasil prepare checkout')
  } catch (error) {
    console.warn('gagal prepare checkout', error)
  } finally {
    await page.goto(urlCart)
    deleteBanner(page)
  }
}

export async function checkOut(page: Page, urlPayment: string) {
  try {
    const buttonLanjutkan = await page.$('[data-testid="cart-btn-summary-cta"]')
    await buttonLanjutkan?.click()
    await page.waitForNavigation()
    await page.goto(urlPayment)
    const buttonVA = await page.$('div ::-p-text(Virtual Account)')
    await buttonVA?.click()
    const buttonOrder = await page.$('div ::-p-text(order sekarang)')
    process.env['ENV'] === 'prod' && (await buttonOrder?.click())
    console.info('berhasil checkout')
  } catch (error) {
    throw error
  }
}
