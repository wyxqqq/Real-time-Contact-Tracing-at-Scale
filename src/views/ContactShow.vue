<template>
  <div class="ContactShow">
    <!-- 地图容器：展示轨迹 -->
    <div class="map-container">
      <NewMapComponent ref="mapComponent" />
    </div>

    <!-- 图表区域：展示轨迹分析（如时间-位置变化） -->
    <div class="LineChart">
      <div id="trajectory-chart" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup name="ContactShow">
import { ref, onMounted, onUnmounted } from 'vue';
import NewMapComponent from '@/components/NewMapComponent.vue';
import * as echarts from 'echarts';
// 导入密接时间数据
import timeContactData from '@/data/time_contact_new.json';
// 导入所有接触对结束时刻的位置数据
import AllContactsData from '@/data/all_contacts.json';

// 图表实例引用
let chartInstance = ref<echarts.ECharts | null>(null);

// 初始化图表
const initChart = () => {
  const chartDom = document.getElementById('trajectory-chart');
  if (!chartDom) return;

  // 初始化图表实例
  chartInstance = echarts.init(chartDom);

  // 处理数据：转为 [时间, 密接次数] 二维数组（适配 value 类型 x 轴）
  const seriesData = timeContactData.map(item => [item.time, item.count]);

  // 图表配置项
  const option = {
    title: {
      text: '密接人员数量随时间变化',
      subtext: '时间范围：0~600秒',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function (params) {
        const [time, count] = params[0].data;
        return `时间：${time} 秒<br/>密接次数：${count} 次`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '时间（秒）',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0, // 固定时间范围起点
      max: 600, // 固定时间范围终点
      axisLabel: {
        interval: 100, // 控制x轴标签显示间隔，避免过于密集
        formatter: '{value}s'
      }
    },
    yAxis: {
      type: 'value',
      name: '密接次数（次）',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        formatter: '{value}次'
      }
    },
    series: [
      {
        name: '密接次数',
        type: 'line',
        data: seriesData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2
        },
        emphasis: {
          itemStyle: {
            symbolSize: 10
          }
        }
      }
    ]
  };

  // 设置图表配置
  chartInstance.setOption(option);


  onUnmounted(() => {

  });
};

// 组件挂载时初始化图表
onMounted(() => {
  initChart();
});

// 组件卸载时销毁图表实例
onUnmounted(() => {
  chartInstance.value?.dispose();
});



</script>

<style scoped>
.ContactShow {
  display: flex;
  min-height: calc(100vh - 60px);
  /* 减去导航栏高度 */
  background-color: #f5f7fa;
  color: black;
}

.map-container {
  flex: 1 1 60%;
  /* 地图占比60% */
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-left: 16px;
}

.LineChart {
  flex: 1 1 40%;
  /* 图表占比40% */
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  margin-right: 16px;
}

.chart-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.chart-container {
  flex: 1;
  width: 100%;
  min-height: 400px;
}
</style>
