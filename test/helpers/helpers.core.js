'use strict'

const { promisify } = require('util')
const path = require('path')
const fs = require('fs')
const SqliteDb = require('sqlite3')

const readdir = promisify(fs.readdir)
const unlink = promisify(fs.unlink)
const mkdir = promisify(fs.mkdir)

const rmDB = async (dir, exclude = ['.gitkeep']) => {
  const files = await readdir(dir)
  const promisesArr = files.map(file => {
    if (exclude.every(exFile => exFile !== file)) {
      return unlink(path.join(dir, file))
    }

    return Promise.resolve()
  })

  return Promise.all(promisesArr)
}

const rmAllFiles = async (dir, exclude) => {
  try {
    await rmDB(dir, exclude)
  } catch (err) {
    if (err.syscall === 'scandir') {
      await mkdir(dir)
    }
  }
}

const queueToPromise = (queue) => {
  return new Promise((resolve, reject) => {
    queue.once('error:base', reject)
    queue.once('completed', res => {
      queue.removeListener('error:base', reject)
      resolve(res)
    })
  })
}

const queueToPromiseMulti = (queue, count, cb = () => { }) => {
  return new Promise((resolve, reject) => {
    let currCount = 0

    const onCompleted = (result) => {
      currCount += 1

      try {
        cb(result)
      } catch (err) {
        reject(err)
      }

      if (currCount >= count) {
        queue.removeListener('completed', onCompleted)
        queue.removeListener('error:base', reject)
        resolve()
      }
    }

    queue.once('error:base', reject)
    queue.on('completed', onCompleted)
  })
}

const queuesToPromiseMulti = (queues, count, cb = () => { }) => {
  return new Promise((resolve, reject) => {
    let currCount = 0

    const onCompleted = (result) => {
      currCount += 1

      try {
        cb(result)
      } catch (err) {
        reject(err)
      }

      if (currCount >= count) {
        queues.forEach(queue => {
          queue.removeListener('completed', onCompleted)
          queue.removeListener('error:base', reject)
        })

        resolve()
      }
    }

    queues.forEach(queue => {
      queue.once('error:base', reject)
      queue.on('completed', onCompleted)
    })
  })
}

const delay = (mc = 500) => {
  return new Promise((resolve) => {
    setTimeout(resolve, mc)
  })
}

const connToSQLite = (wrk) => {
  return new Promise((resolve, reject) => {
    const db = new SqliteDb.Database(':memory:', async (err) => {
      if (err) {
        reject(err)

        return
      }

      wrk.grc_bfx.api.db = db
      await wrk.grc_bfx.api._syncModeInitialize(db)
      resolve(db)
    })
  })
}

const closeSQLite = (db) => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err)

        return
      }

      resolve()
    })
  })
}

module.exports = {
  rmDB,
  rmAllFiles,
  queueToPromise,
  queueToPromiseMulti,
  queuesToPromiseMulti,
  delay,
  connToSQLite,
  closeSQLite
}
