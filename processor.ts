import puppeteer from 'puppeteer'
import { mkdir, writeFile } from 'fs'
import type { Page } from 'puppeteer'

export default class Processor {
  private page?: Page
  private dirName?: string
  private headers: Record<string, string> = {}
  private urlQuery: string = ''
  private addressID: number = -1

  constructor(private name: string, private isProd: boolean) {
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
    await this.page.setRequestInterception(true)
    this.page
      .on('request', (request) => request.continue())
      .on('response', async (response) => {
        if (response.url().includes('/query')) {
          try {
            const responseData = await response.json()
            this.headers = response.request().headers()
          } catch (error) { }
        }
      })
      .on('console', (message) => {
        const text = message.text()
        if (!text.includes('~')) return
        if (text.includes('~dataCO')) {
          const dataCO = text.split(' ')[1]
          writeFile(`./ss/${this.dirName}/dataCO.json`, dataCO, (error) => {
            if (error) console.warn('gagal simpan dataCO')
          })
          return
        }
        if (text.includes('~addressID')) {
          this.addressID = +text.split(' ')[1] ?? -1
        }
        console.info(`console ${this.name}: ${text}`)
      })
  }

  async login(url: string, urlQuery: string, email: string, password: string) {
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

    ; (async () => {
      try {
        const banner = await this.page?.waitForSelector('#desktopBannerWrapped')
        await banner?.evaluateHandle((el) => el.remove())
      } catch (error) { }
    })()

    try {
      const buttonOK = await this.page?.waitForSelector(
        '#driver-popover-item button'
      )
      await buttonOK?.click()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) { }

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
    } catch (error) { }

    try {
      this.urlQuery = urlQuery
      await this.page?.evaluate(
        async (urlQuery, headers) => {
          try {
            const addressID = await fetch(urlQuery, {
              method: 'POST',
              body: JSON.stringify([
                {
                  operationName: 'getAddressList',
                  variables: {},
                  query:
                    'query getAddressList($size: Int, $page: Int) {\n  getAddressList(size: $size, page: $page) {\n    meta {\n      page\n      size\n      sort\n      sortType\n      keyword\n      totalData\n      totalPage\n      message\n      error\n      code\n    }\n    result {\n      isSelected\n      addressID\n      addressName\n      addressPhone\n      addressLabel\n      addressZipCode\n      addressDetail\n      latitude\n      longitude\n      provinceID\n      provinceName\n      districtName\n      districtID\n      subdistrictName\n      subdistrictID\n    }\n  }\n}\n',
                },
              ]),
              headers,
            }).then(async (response) => {
              const addressList: any = await response.json()
              return addressList[0].data.getAddressList.result[0]
                .addressID as number
            })

            if (addressID) {
              console.log(`~addressID ${addressID}`)
            } else {
              console.log('~error gak ada address id')
            }
          } catch (error) { }
        },
        urlQuery,
        this.headers
      )
    } catch (error) { }
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
      await this.page?.waitForNavigation()
      await this.page?.waitForSelector('#cart-item-0')
      await this.page?.screenshot({
        path: `./ss/${this.dirName}/4-cart.jpg`,
        optimizeForSpeed: true,
      })
    } catch (error) { }
  }

  async checkOut(urlListCO: string) {
    console.time(`${this.name} waktu CO`)
    try {
      await this.page?.evaluate(
        async (urlQuery, headers, addressID, isProd) => {
          const process: () => Promise<string[]> = async () => {
            const responses: string[] = []

            try {
              responses.push(... await Promise.all([
                await fetch(urlQuery, {
                  method: 'POST',
                  body: JSON.stringify([
                    {
                      operationName: 'processCheckout',
                      variables: {},
                      query:
                        'query processCheckout {\n  processCheckout {\n    meta {\n      message\n      error\n      code\n    }\n    result\n  }\n}\n',
                    },
                  ]),
                  headers,
                }).then(async (response) => {
                  const jsonResponse: any = await response.json()
                  console.log(
                    `~processCheckout ${JSON.stringify(jsonResponse)}`
                  )
                  return jsonResponse[0].data.processCheckout.meta
                    .code as string
                }),
                await fetch(urlQuery, {
                  method: 'POST',
                  body: JSON.stringify([
                    {
                      operationName: 'addPreBook',
                      variables: {
                        params: {
                          isRewardPoint: false,
                          addressID,
                          shippingID: 4,
                          shippingName: 'J&T',
                          shippingDuration: 'Estimasi pengiriman 2-3 Hari',
                        },
                      },
                      query:
                        'mutation addPreBook($params: PreBookRequest!) {\n  addPreBook(params: $params) {\n    meta {\n      message\n      error\n      code\n    }\n    result {\n      status\n      orderID\n      analytic {\n        affiliation\n        coupon\n        currency\n        transaction_id\n        shipping\n        insurance\n        value\n        partial_reward\n        coupon_discount\n        shipping_discount\n        location\n        quantity\n        items {\n          item_id\n          item_name\n          affiliation\n          coupon\n          currency\n          discount\n          index\n          item_brand\n          item_category\n          item_category2\n          item_category3\n          item_category4\n          item_category5\n          item_list_id\n          item_list_name\n          item_variant\n          price\n          quantity\n        }\n        content_id\n        content_type\n        contents {\n          id\n          quantity\n        }\n        description\n        category_id\n        category_name\n        brand_id\n        brand_name\n        sub_brand_id\n        sub_brand_name\n        order_id\n        order_date\n        total_trx\n        shipping_fee\n        insurance_fee\n        tax\n        discount\n        partial_mw_reward\n        shipping_method\n        payment_method\n        is_dropship\n        voucher_code\n        products\n      }\n    }\n  }\n}\n',
                    },
                  ]),
                  headers,
                }).then(async (response) => {
                  const jsonResponse: any = await response.json()
                  console.log(`~addPreBook ${JSON.stringify(jsonResponse)}`)
                  return jsonResponse[0].data.addPreBook.meta.code as string
                })
              ]))
              if (isProd) {
                responses.push(
                  await fetch(urlQuery, {
                    method: 'POST',
                    body: JSON.stringify([
                      {
                        operationName: 'addOrder',
                        variables: {
                          params: {
                            paymentID: 57,
                            paymentCode: 'VABCA',
                            paymentName: 'BCA Virtual Account',
                            paymentParentCode: 'VirtualAccount',
                          },
                        },
                        query:
                          'mutation addOrder($params: AddOrderRequest!) {\n  addOrder(params: $params) {\n    meta {\n      error\n      code\n      message\n    }\n    result {\n      payment {\n        status\n        orderId\n        redirectUrl\n      }\n      analytic {\n        affiliation\n        coupon\n        currency\n        transaction_id\n        transaction_code\n        shipping\n        insurance\n        value\n        partial_reward\n        coupon_discount\n        shipping_discount\n        location\n        quantity\n        items {\n          item_id\n          item_name\n          affiliation\n          currency\n          discount\n          index\n          item_brand\n          item_category\n          item_category2\n          item_category3\n          item_category4\n          item_category5\n          item_list_id\n          item_list_name\n          item_variant\n          price\n          quantity\n        }\n        content_id\n        content_type\n        contents {\n          id\n          quantity\n        }\n        description\n        category_id\n        category_name\n        brand_id\n        brand_name\n        sub_brand_id\n        sub_brand_name\n        order_id\n        order_date\n        total_trx\n        shipping_fee\n        insurance_fee\n        tax\n        discount\n        partial_mw_reward\n        shipping_method\n        payment_method\n        is_dropship\n        voucher_code\n        products\n        total_price\n        gender\n        db\n        user_id\n        fb_login_id\n        ip_override\n        user_data {\n          email_address\n          phone_number\n          client_ip_address\n          address {\n            first_name\n            last_name\n            city\n            region\n            postal_code\n            country\n          }\n        }\n      }\n    }\n  }\n}\n',
                      },
                    ]),
                    headers,
                  }).then(async (response) => {
                    const jsonResponse: any = await response.json()
                    console.log(`~addOrder ${JSON.stringify(jsonResponse)}`)
                    return jsonResponse[0].data.addOrder.meta.code as string
                  })
                )
              }
            } catch (error) {
              console.log('~error masih ada yang gagal di proses')
              responses.push('error')
            }

            return responses
          }

          let allStatus: string[] = []
          while (true) {
            allStatus = await process()
            if (!allStatus.some((status) => status !== 'success')) break
          }
          console.log(`~dataCO ${JSON.stringify(allStatus)}`)
        },
        this.urlQuery,
        this.headers,
        this.addressID,
        this.isProd
      )
    } catch (error) {
      console.warn('gagal CO')
      throw error
    }
    console.timeEnd(`${this.name} waktu CO`)

    if (this.isProd) {
      try {
        await this.page?.goto(urlListCO)
        await this.page?.waitForSelector('#orders-item-0')
        await this.page?.screenshot({
          path: `./ss/${this.dirName}/4-final-co-product.jpg`,
          optimizeForSpeed: true,
        })
      } catch (error) { }
    }
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

  private async deleteBanner() {
    try {
      await this.page?.waitForSelector('[id^="moe-onsite-campaign-"]')
      const banner = await this.page?.$('[id^="moe-onsite-campaign-"]')
      await banner?.evaluateHandle((el) => el.remove())
      console.info(`${this.name} delete welcome banner`)
    } catch (error) { }
  }
}
