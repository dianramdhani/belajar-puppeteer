import { Page } from 'puppeteer'

let name: string = ''

export async function login(page: Page, email: string, password: string) {
  name = email.split('@')[0]
  await page.screenshot({
    path: `./ss/${name}-1-before-login.jpg`,
    optimizeForSpeed: true,
  })
  ;(async () => {
    try {
      const banner = await page.waitForSelector('#desktopBannerWrapped')
      await banner?.evaluateHandle((el) => el.remove())
    } catch (error) {}
  })()

  try {
    const buttonOK = await page.waitForSelector('#driver-popover-item button')
    await buttonOK?.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  } catch (error) {}

  try {
    const buttonLogin = await page.$('#login-button')
    await buttonLogin?.click()
    await page.waitForSelector('[data-testid="login-form"]')
    const modalLogin = await page.$('[data-testid="login-form"]')
    if (modalLogin) {
      const inputName = await modalLogin.$('[name="username"]')
      await inputName?.type(email)
      const [inputPassword, checkRemember, buttonLogin] = await Promise.all([
        modalLogin.waitForSelector('[name="password"]'),
        modalLogin.waitForSelector('#remember-me'),
        modalLogin.waitForSelector('form button'),
      ])
      await inputPassword?.type(password)
      await checkRemember?.click()
      await buttonLogin?.click()
      console.info('login success')
      await deleteBanner(page)
      await page.screenshot({
        path: `./ss/${name}-2-after-login.jpg`,
        optimizeForSpeed: true,
      })
    }
  } catch (error) {
    console.warn('gagal login')
  }
}

export async function deleteBanner(page: Page) {
  try {
    await page.waitForSelector('[id^="moe-onsite-campaign-"]')
    const banner = await page.$('[id^="moe-onsite-campaign-"]')
    await banner?.evaluateHandle((el) => el.remove())
    console.info('delete welcome banner')
  } catch (error) {}
}

export async function addProductToCart(page: Page, urlProduct: string) {
  try {
    await page.goto(urlProduct)
    deleteBanner(page)
    const buttonBuyNow = await page.waitForSelector('#btn-buy-now')
    await page.screenshot({
      path: `./ss/${name}-3-add-product-to-cart.jpg`,
      optimizeForSpeed: true,
    })
    await buttonBuyNow?.click()
    await page.waitForNavigation()
    await page.screenshot({
      path: `./ss/${name}-4-cart.jpg`,
      optimizeForSpeed: true,
    })
    console.info('tambah produk')
  } catch (error) {}
}

export async function checkOut(page: Page, urlCart: string) {
  try {
    const buttonLanjutkan = await page.waitForSelector(
      '[data-testid="cart-btn-summary-cta"]'
    )
    await buttonLanjutkan?.click()
    await page.waitForNavigation()
    const buttonExpedition = await page.waitForSelector(
      '[aria-label="Choose shipping method"]'
    )
    await buttonExpedition?.click()
    await page.waitForSelector(
      '[data-testid="shipping-method-dropdown"] p ::-p-text(JNE)'
    )
    const selectExpedition = await page?.waitForSelector(
      '[data-testid="shipping-method-dropdown"] li:nth-child(3)'
    )
    await selectExpedition?.click()
    await page.screenshot({
      path: `./ss/${name}-5-select-expedition.jpg`,
      optimizeForSpeed: true,
    })
    const buttonPilihPembayaran = await page.waitForSelector(
      'button:not(.btn-disabled) ::-p-text(Pilih Pembayaran)'
    )
    await buttonPilihPembayaran?.click()
    await page.waitForNavigation()
    const buttonVA = await page.waitForSelector(
      'div ::-p-text(Virtual Account)'
    )
    await buttonVA?.click()
    await page.screenshot({
      path: `./ss/${name}-6-payment-method.jpg`,
      optimizeForSpeed: true,
    })
    const buttonOrder = await page.waitForSelector(
      'div ::-p-text(order sekarang)'
    )
    process.env['ENV'] === 'prod' && (await buttonOrder?.click())
    await page.screenshot({
      path: `./ss/${name}-7-final.jpg`,
      optimizeForSpeed: true,
    })
    console.info('berhasil checkout')
  } catch (error) {
    throw error
  }
}

export async function clearCart(page: Page, urlCart: string) {
  try {
    await page.goto(urlCart)
    await page.screenshot({
      path: `./ss/${name}-3-cart.jpg`,
      optimizeForSpeed: true,
    })
    const buttonHapus = await page.waitForSelector(
      '[data-testid="delete-multiple"]'
    )
    await buttonHapus?.click()
    const dialog = await page.waitForSelector(
      '[data-testid="delete-cart-modal"]'
    )
    const buttonConfirmHapus = await dialog?.waitForSelector(
      '[aria-label="delete-item"]'
    )
    await buttonConfirmHapus?.click()
    console.info('berhasil clear cart')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await page.screenshot({
      path: `./ss/${name}-4-final.jpg`,
      optimizeForSpeed: true,
    })
  } catch (error) {
    console.warn('gagal clear cart')
  }
}
