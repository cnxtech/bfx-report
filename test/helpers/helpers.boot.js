'use strict'

const { stopWorkers, startWorkers } = require('./helpers.worker')
const configRequest = require('./grenacheClientService')
const { bootTwoGrapes, killGrapes } = require('./helpers.grape')

let grapes = null

const startEnviroment = (
  logs = false,
  isRootWrk = false,
  countWrk = 1,
  conf = {},
  serviceRoot
) => {
  return new Promise((resolve, reject) => {
    let count = 0

    bootTwoGrapes(async (err, g) => {
      if (err) reject(err)
      const {
        wrksReportServiceApi,
        amount
      } = startWorkers(
        logs,
        isRootWrk,
        countWrk,
        conf,
        serviceRoot
      )

      grapes = g

      grapes[0].on('announce', async () => {
        count += 1

        if (count === amount) {
          try {
            const request = await configRequest(
              'http://127.0.0.1:30001',
              'rest:report:api'
            )
            const requestCalls = await configRequest(
              'http://127.0.0.1:30001',
              'rest:ext:testcalls'
            )

            resolve({ request, requestCalls, wrksReportServiceApi })
          } catch (e) {
            reject(e)
          }
        }
      })
    })
  })
}

const stopEnviroment = async () => {
  await stopWorkers()

  return new Promise((resolve, reject) => {
    try {
      killGrapes(grapes, resolve)
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  startEnviroment,
  stopEnviroment
}
