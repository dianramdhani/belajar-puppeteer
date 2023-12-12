import puppeteer from 'puppeteer'
import { mkdir, writeFile } from 'fs'
import type { Page } from 'puppeteer'

export default class Processor {
  private page?: Page
  private dirName: string = ''
  private urlQuery: string = ''
  private headers: Record<string, string> = {}
  private addressID: number = -1

  constructor(private isProd: boolean) {
    this.dirName = new Date().getTime().toString()
    mkdir(
      `./ss/${this.dirName}`,
      { recursive: true },
      (err) => err && console.warn('gagal buat folder')
    )
  }

  async initialize(url: string, urlQuery: string) {
    const browser = await puppeteer.launch({
      args: ['--enable-gpu'],
      headless: false,
      defaultViewport: null,
    })
    this.page = (await browser.pages())[0]
    this.urlQuery = urlQuery

    try {
      await this.logHandler()
      console.info('sukses init log handler')
    } catch (error) {
      throw new Error('gagal init log handler')
    }

    try {
      await this.page.goto(url)
    } catch (error) {}

    try {
      await this.getAddressID()
      console.info('berhasil get addressID')
    } catch (error) {
      throw new Error('gagal get addressID')
    }
  }

  async checkOut(urlListCO: string) {
    console.time('waktu CO')
    try {
      await this.page?.waitForSelector('#cart-item-0', { timeout: 300000 })
      await this.page?.evaluate(
        async (urlQuery, headers, addressID, isProd) => {
          const process: () => Promise<string[]> = async () => {
            const responses: string[] = []

            try {
              responses.push(
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
                  const code = jsonResponse[0].data.processCheckout.meta
                    .code as string
                  console.log(`~processCheckout ${code}`)
                  return code
                })
              )
              responses.push(
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
                  const code = jsonResponse[0].data.addPreBook.meta
                    .code as string
                  console.log(`~addPreBook ${code}`)
                  return code
                })
              )
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
                    const code = jsonResponse[0].data.addOrder.meta
                      .code as string
                    console.log(`~addOrder ${code}`)
                    return code
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
    console.timeEnd('waktu CO')

    if (this.isProd) {
      try {
        await this.page?.goto(urlListCO)
        await this.page?.waitForSelector('#orders-item-0')
        await this.page?.screenshot({
          path: `./ss/${this.dirName}/co.jpg`,
          optimizeForSpeed: true,
        })
      } catch (error) {}
    }
  }

  private async logHandler() {
    await this.page?.setRequestInterception(true)
    this.page
      ?.on('request', (request) => request.continue())
      .on('response', async (response) => {
        if (response.url().includes('/query')) {
          try {
            const responseData = await response.json()
            this.headers = response.request().headers()
          } catch (error) {}
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
        console.info(`console: ${text}`)
      })
  }

  private async getAddressID() {
    await this.page?.waitForSelector('#cart-item-0', {
      timeout: 300000,
    })
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
        } catch (error) {}
      },
      this.urlQuery,
      this.headers
    )
  }
}
