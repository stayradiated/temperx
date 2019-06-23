const express = require('express')
const childProcess = require('child-process-es6-promise')
const { register, Gauge } = require('prom-client')

const server = express()

server.get('/metrics', (req, res) => {
	res.set('Content-Type', register.contentType)
	res.end(register.metrics())
})

const gauge = new Gauge({
  name: 'temperature',
  help: 'temperature help'
})

const readTemp = async () => {
  const {stdout} = await childProcess.exec('../temperx')
  const value = parseFloat(stdout.trim())
	gauge.set(value)
}

(async function readTempLoop () {
  await readTemp()
  setTimeout(readTempLoop, 1000) // sample every second
}())

console.log('Server listening to 8080, metrics exposed on /metrics endpoint')
server.listen(8080)
