<template>
  <div class="ContactShow">
    <!-- 地图容器：展示轨迹 -->
    <div class="map-container">
      <NewMapComponent ref="mapComponent" />
    </div>

    <!-- 图表区域：展示轨迹分析（如时间-位置变化） -->
    <div class="LineChart">
      <div >可以点击蓝色折线或输入时间查看某一时刻密接事件分布</div>
      <!-- 新增时间输入框 -->
      <div class="time-input-container">
        
        <input type="number" v-model="inputTime" class="time-input" placeholder="输入时间（0-599秒）" min="0" max="599"
          @keyup.enter="handleTimeInput">
        <button @click="handleTimeInput" class="time-input-btn">确认</button>
      </div>
      <div id="trajectory-chart" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup name="ContactShow">
import { ref, onMounted, onUnmounted } from 'vue';
import NewMapComponent from '@/components/NewMapComponent.vue';
import * as echarts from 'echarts';

// 导入密接时间数据
import timeContactData from '@/data/time_contact.json';
// 导入所有接触对结束时刻的位置数据
import AllContactsData from '@/data/all_contacts.json';

// 图表实例引用
let chartInstance = ref(null);
const mapComponent = ref(null);
let currentTime = ref(599); // 存储当前选中的时间点
const inputTime = ref(''); // 输入框绑定的时间值

// 处理时间输入
const handleTimeInput = () => {
  // 验证输入合法性
  const time = parseInt(inputTime.value, 10);
  if (isNaN(time) || time < 0 || time > 600) {
    alert('请输入0-599之间的有效时间');
    return;
  }

  // 查找最接近的时间点数据
  const timePoints = Object.keys(timeContactData).map(Number);
  const closestTime = timePoints.reduce((prev, curr) => {
    return (Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev);
  });

  // 获取对应时间点的密接次数
  const count = timeContactData[closestTime];

  // 更新当前时间
  currentTime.value = closestTime;

  // 更新图表标记点
  if (chartInstance) {
    console.log("输入时间的光点更新了");
    chartInstance.setOption({
      series: [{
        markPoint: {
          data: [{
            xAxis: closestTime,
            yAxis: count,
            itemStyle: { color: 'red' }
          }],
          // 原点的 tooltip 配置（和折线点效果一致）
          tooltip: {
            trigger: 'item',
            formatter: function (params) {
              const time = params.data.xAxis;
              const count = params.data.yAxis;
              return `当前选中时间：${time} 秒<br/>密接次数：${count} 次`;
            }
          },
        }
      }]
    });
  }

  // 传递时间到地图组件
  if (mapComponent.value) {
    mapComponent.value.setFilterTime(closestTime);
  }

};

// 初始化图表
const initChart = () => {
  const chartDom = document.getElementById('trajectory-chart');
  if (!chartDom) return;

  // 初始化图表实例
  chartInstance = echarts.init(chartDom);

  // 假设 timeContactData 是解析后的 JSON 对象（从 time_contact.json 读取）
  // 转换为 [时间(数字), 密接次数] 二维数组
  const seriesData = Object.entries(timeContactData).map(([timeStr, count]) => [
    Number(timeStr),  // 将时间字符串转为数字（如 "14" → 14）
    count             // 密接次数（原数值直接使用）
  ]);

  // 图表配置项
  const option = {
    title: {
      text: '密接事件数量随时间变化',
      subtext: '时间范围：0~600秒',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      axisPointer: {
        type: 'none'
      },
      // 修复 formatter 函数，确保正确获取数据
      formatter: function (params) {
        // 直接通过数组索引访问，避免解构失败
        const time = params.data[0];
        const count = params.data[1];
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
      max: 700, // 固定时间范围终点
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
        symbolSize: 4,
        lineStyle: {
          width: 2
        },
        emphasis: {
          itemStyle: {
            symbolSize: 10
          }
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 12,
          data: [{
            name: '当前时间',
            xAxis: currentTime.value,
            yAxis: timeContactData[currentTime.value] || 0,
            itemStyle: { color: 'red' }
          }],
          // 原点的 tooltip 配置（和折线点效果一致）
          tooltip: {
            trigger: 'item',
            formatter: function (params) {
              const time = params.data.xAxis;
              const count = params.data.yAxis;
              return `当前选中时间：${time} 秒<br/>密接次数：${count} 次`;
            },
            show: true
          },
          label: {
            formatter: function (params) {
              const time = params.data.xAxis;
              const count = params.data.yAxis;
              return `当前选中时间：${time} 秒\n密接次数：${count} 次`;
            },
            show: true,
            backgroundColor: 'rgba(255, 102, 102, 0.9)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 500,
            padding: [10, 14],
            borderRadius: 6,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            shadowBlur: 4,
            shadowColor: 'rgba(0, 0, 0, 0.15)',
            shadowOffsetX: 1,
            shadowOffsetY: 1,
            lineHeight: 18,
            position: 'top',

            offset: [12, 0], // 右侧时偏移+12px，左侧时自动变为-12px（ECharts自动适配）
          }
        }
      }
    ]
  };


  // 设置图表配置
  chartInstance.setOption(option);

  // 添加点击事件
  chartInstance.on('click', (params) => {
    // 获取点击位置对应的时间
    const clickedTime = Math.round(params.value[0]);
    currentTime.value = clickedTime;
    // 更新光点位置
    chartInstance.setOption({
      series: [{
        markPoint: {
          data: [{
            xAxis: clickedTime,
            yAxis: params.value[1],
            itemStyle: { color: 'red' }
          }],
          // 原点的 tooltip 配置（和折线点效果一致）
          tooltip: {
            trigger: 'item',
            formatter: function (params) {
              const time = params.data.xAxis;
              const count = params.data.yAxis;
              return `当前选中时间：${time} 秒<br/>密接次数：${count} 次`;
            }
          },
        }
      }]
    });

    // 传递时间到地图组件
    if (mapComponent.value) {
      mapComponent.value.setFilterTime(clickedTime);
      console.log("光点对应的时间", clickedTime);
    }

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
  text-align: center
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

/* 新增时间输入框样式 */
.time-input-container {
  display: flex;
  gap: 10px;
  margin-right: 128px;
  margin-left: 128px;
}

.time-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.time-input-btn {
  padding: 8px 16px;
  background-color: #1677ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.time-input-btn:hover {
  background-color: #0f5fcf;
}
</style>
