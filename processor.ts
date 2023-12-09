import puppeteer from 'puppeteer'
import { mkdir } from 'fs'
import type { Page } from 'puppeteer'

export default class Processor {
  private page?: Page
  private dirName?: string

  constructor(private name: string) {
    this.dirName = `${new Date().getTime()}-${this.name}`
    mkdir(
      `./ss/${this.dirName}`,
      { recursive: true },
      (err) => err && console.warn('gagal buat folder')
    )
  }

  async initialize(browserType: string) {
    const browser = await puppeteer.launch({
      args: ['--enable-gpu'],
      ...(browserType === 'headless'
        ? {
            headless: 'new',
            defaultViewport: {
              width: 1920,
              height: 1080,
            },
          }
        : {
            headless: false,
            defaultViewport: null,
          }),
    })
    this.page = (await browser.pages())[0]
  }

  async login(url: string, email: string, password: string) {
    try {
      await this.page?.goto(url)
    } catch (error) {
      console.warn(`${this.name} buka page kelamaan`)
    } finally {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/1-before-login.jpg`,
        optimizeForSpeed: true,
      })
    }

    ;(async () => {
      try {
        const banner = await this.page?.waitForSelector('#desktopBannerWrapped')
        await banner?.evaluateHandle((el) => el.remove())
      } catch (error) {}
    })()

    try {
      const buttonOK = await this.page?.waitForSelector(
        '#driver-popover-item button'
      )
      await buttonOK?.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {}

    try {
      const buttonLogin = await this.page?.$('#login-button')
      await buttonLogin?.click()
      await this.page?.waitForSelector('[data-testid="login-form"]')
      const modalLogin = await this.page?.$('[data-testid="login-form"]')

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
        await new Promise((resolve) => setTimeout(resolve, 5000))
        await this.page?.screenshot({
          path: `./ss/${this.dirName}/2-after-login.jpg`,
          optimizeForSpeed: true,
        })
        console.info(`${this.name} login success`)
      }
    } catch (error) {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/2-gagal-login.jpg`,
        optimizeForSpeed: true,
      })
      console.warn(`${this.name} gagal login`)
    }

    try {
      await this.deleteBanner()
    } catch (error) {}
  }

  async deleteBanner() {
    try {
      await this.page?.waitForSelector('[id^="moe-onsite-campaign-"]')
      const banner = await this.page?.$('[id^="moe-onsite-campaign-"]')
      await banner?.evaluateHandle((el) => el.remove())
      console.info(`${this.name} delete welcome banner`)
    } catch (error) {}
  }

  async addProductToCart(urlProduct: string) {
    try {
      await this.page?.goto(urlProduct)
    } catch (error) {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/3-gagal-menuju-page-produk.jpg`,
        optimizeForSpeed: true,
      })
      throw new Error(`${this.name} gagal membuka page produk`)
    } finally {
      this.deleteBanner()
    }

    try {
      const buttonBuyNow = await this.page?.waitForSelector('#btn-buy-now')
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/3-add-product-to-cart.jpg`,
        optimizeForSpeed: true,
      })
      await buttonBuyNow?.click()
      console.info(`${this.name} tambah produk`)
    } catch (error) {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/3-gagal-tambah-produk.jpg`,
        optimizeForSpeed: true,
      })
      throw new Error(`${this.name} gagal tambah produk`)
    }

    try {
      this.page?.waitForNavigation().then(() =>
        this.page?.screenshot({
          path: `./ss/${this.dirName}/4-cart.jpg`,
          optimizeForSpeed: true,
        })
      )
    } catch (error) {}
  }

  async prepareCheckout(urlCart: string) {
    try {
      const buttonLanjutkan = await this.page?.waitForSelector(
        '[data-testid="cart-btn-summary-cta"]'
      )
      await buttonLanjutkan?.click()
      await this.page?.waitForNavigation()
    } catch (error) {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/5-gagal-menuju-form-expedition.jpg`,
        optimizeForSpeed: true,
      })
      throw new Error(`${this.name} gagal menuju form expedition`)
    }

    try {
      const buttonExpedition = await this.page?.waitForSelector(
        '[aria-label="Choose shipping method"]'
      )
      await buttonExpedition?.click()
      await this.page?.waitForSelector(
        '[data-testid="shipping-method-dropdown"] p ::-p-text(JNE)'
      )
      const selectExpedition = await this.page?.waitForSelector(
        '[data-testid="shipping-method-dropdown"] li:nth-child(3)'
      )
      await selectExpedition?.click()
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/5-select-expedition.jpg`,
        optimizeForSpeed: true,
      })
      const buttonPilihPembayaran = await this.page?.waitForSelector(
        'button:not(.btn-disabled) ::-p-text(Pilih Pembayaran)'
      )
      await buttonPilihPembayaran?.click()
      await this.page?.waitForNavigation()
    } catch (error) {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/5-gagal-menuju-page-payment.jpg`,
        optimizeForSpeed: true,
      })
      console.warn(`${this.name} gagal menuju page payment`)
    }

    try {
      this.page?.on('dialog', (dialog) => dialog.accept())
      await this.page?.goto(urlCart)
      console.info(`${this.name} berhasil prepare checkout`)
    } catch (error) {
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/5-gagal-menuju-url-cart.jpg`,
        optimizeForSpeed: true,
      })
      throw new Error(`${this.name} gagal menuju url cart`)
    }
  }

  async checkOut(urlPayment: string) {
    console.time(`${this.name} lama CO`)

    console.time(`${this.name} klik tombol lanjutkan`)
    try {
      const buttonLanjutkan = await this.page?.waitForSelector(
        '[data-testid="cart-btn-summary-cta"]'
      )
      await buttonLanjutkan?.click()
      await this.page?.waitForNavigation()
    } catch (error) {
      console.warn(`${this.name} gagal menuju form expedition`)
    }
    console.timeEnd(`${this.name} klik tombol lanjutkan`)

    console.time(`${this.name} navigasi ke url payment`)
    try {
      await this.page?.goto(urlPayment)
    } catch (error) {
      throw new Error(`${this.name} gagal menuju url payment`)
    }
    console.timeEnd(`${this.name} navigasi ke url payment`)

    console.time(`${this.name} berhasil checkout`)
    try {
      const buttonVA = await this.page?.waitForSelector(
        'div ::-p-text(Virtual Account)'
      )
      await buttonVA?.click()
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/6-payment-method.jpg`,
        optimizeForSpeed: true,
      })
      const buttonOrder = await this.page?.waitForSelector(
        'div ::-p-text(order sekarang)'
      )
      process.env['ENV'] === 'prod' && (await buttonOrder?.click())
    } catch (error) {
      throw new Error(`${this.name} gagal checkout`)
    }
    console.timeEnd(`${this.name} berhasil checkout`)

    console.timeEnd(`${this.name} lama CO`)
    try {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/7-final.jpg`,
        optimizeForSpeed: true,
      })
    } catch (error) {}
  }

  async clearCart(urlCart: string) {
    try {
      await this.page?.goto(urlCart)
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/3-cart.jpg`,
        optimizeForSpeed: true,
      })
      const buttonHapus = await this.page?.waitForSelector(
        '[data-testid="delete-multiple"]'
      )
      await buttonHapus?.click()
      const dialog = await this.page?.waitForSelector(
        '[data-testid="delete-cart-modal"]'
      )
      const buttonConfirmHapus = await dialog?.waitForSelector(
        '[aria-label="delete-item"]'
      )
      await buttonConfirmHapus?.click()
      console.info(`${this.name} berhasil clear cart`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/4-final.jpg`,
        optimizeForSpeed: true,
      })
    } catch (error) {
      console.warn(`${this.name} gagal clear cart`)
    }
  }
}
