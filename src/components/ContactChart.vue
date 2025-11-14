<template>
  <div ref="chartRef" class="contact-chart"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['timeChange'])

const chartRef = ref(null)
let chartInstance = null

const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  updateChart()
  
  // 监听图表数据区域选择事件
  chartInstance.on('dataZoom', (params) => {
    const option = chartInstance.getOption()
    const startValue = option.dataZoom[0].startValue || 0
    const endValue = option.dataZoom[0].endValue || props.data.length - 1
    const selectedTime = props.data[startValue].time
    emit('timeChange', selectedTime)
  })
}

const updateChart = () => {
  if (!chartInstance) return
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.time)
    },
    yAxis: {
      type: 'value',
      name: '密接人数'
    },
    series: [
      {
        data: props.data.map(item => item.count),
        type: 'line',
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(58, 77, 233, 0.8)' },
            { offset: 1, color: 'rgba(58, 77, 233, 0.1)' }
          ])
        }
      }
    ],
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: 0,
        start: 0,
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        start: 0,
        end: 100
      }
    ]
  }
  
  chartInstance.setOption(option)
}

const resizeChart = () => {
  chartInstance?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})

watch(() => props.data, () => {
  updateChart()
}, { deep: true })
</script>

<style scoped>
.contact-chart {
  width: 100%;
  height: 100%;
}
</style>
