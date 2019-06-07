const express = require('express')
const childProcess = require('child-process-es6-promise')
const { DateTime } = require('luxon')

const app = express()

const READING_SIZE = 100

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

app.get('/', (req, res) => {

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

app.listen(3000)

const readTemp = async () => {
  const {stdout} = await childProcess.exec('../temperx')
  const value = parseFloat(stdout.trim())
  if (readings.length >= READING_SIZE) {
    readings.shift()
  }

  const reading = {
    timestamp: DateTime.local().toFormat('TT'),
    value
  }
  console.log(reading)

  readings.push(reading)
}

(async function readTempLoop () {
  await readTemp()
  setTimeout(readTempLoop, 1000)
}())
