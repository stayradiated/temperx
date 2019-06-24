const express = require('express')
const childProcess = require('child-process-es6-promise')
const { DateTime } = require('luxon')
const { register, Gauge } = require('prom-client')

const server = express()

const PORT = process.env.PORT || '3000'
const SLEEP_TIME = 1000 // every second
const SAMPLE_HISTORY = 240
const SAMPLE_FREQUENCY = 60

const CHART_DOMAIN = 'https://quickchart.io/chart?c='

const CHART_CONFIG = {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label:'Temperature',
      fill:false,
      backgroundColor:'rgb(54, 162, 235)',
      borderColor:'rgb(54, 162, 235)',
      data: []
    }]
  },
  options: {
    scales: {
      yAxes: [{
        ticks: {
          suggestedMin: 30,
          suggestedMax: 35
        }
      }]
    }
  }
}

const readings = []
const values = (array) => array.map((item) => item.value)
const timestamps = (array) => array.map((item) => item.timestamp)
const getMax = (array) => array.reduce((a, b) => Math.max(a, b), 0)
const getMin = (array) => array.reduce((a, b) => Math.min(a, b), Infinity)

const gauge = new Gauge({
  name: 'temperature_office_berlin',
  help: 'The temperature of the Mish Guru office in Berlin (celsius)'
})

server.get('/', (req, res) => {
  CHART_CONFIG.options.scales.yAxes[0].ticks = {
    suggestedMin: getMin(values(readings)) - 0.2,
    suggestedMax: getMax(values(readings)) + 0.2
  }

  CHART_CONFIG.data.labels = timestamps(readings)
  CHART_CONFIG.data.datasets[0].data = values(readings)

  const config = JSON.stringify(CHART_CONFIG)
  const chartUrl = CHART_DOMAIN + encodeURIComponent(config)

  res.send(`<img src="${chartUrl}"> `)
})

server.get('/metrics', (req, res) => {
	res.set('Content-Type', register.contentType)
	res.end(register.metrics())
})

const readTemp = async (counter) => {
  const {stdout} = await childProcess.exec('../temperx')
  const value = parseFloat(stdout.trim())
	gauge.set(value)

  if (counter >= SAMPLE_FREQUENCY) {
    if (readings.length >= SAMPLE_HISTORY) {
      readings.shift()
    }

    const reading = {
      timestamp: DateTime.local().toFormat('TT'),
      value
    }
    console.log(reading)

    readings.push(reading)
    counter = 0
  } else {
    counter += 1
  }
  return counter
}

(async function readTempLoop (counter) {
  const nextValue = await readTemp(counter)
  setTimeout(() => readTempLoop(nextValue), SLEEP_TIME)
}(0))

console.log(`Server listening to ${PORT}, metrics exposed on /metrics endpoint.`)
server.listen(PORT)
