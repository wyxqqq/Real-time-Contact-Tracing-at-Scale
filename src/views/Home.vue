<template>
  <div class="home">
    <header>
      数据范围与系统价值提示（顶部横幅）<br>
      明确标注数据时间范围：“当前展示 1000 秒内济南市人员密接流动数据”，避免用户误解数据跨度。<br>
      简洁传递价值：“基于实时位置分析，精准识别密接 / 次密接，可视化呈现传播轨迹”。<br>
    </header>
    <section class="card1">
      卡片1：“个人密接轨迹查询”，配 “输入 ID 查询” 按钮，点击直接跳转至 “密接人员轨道绘制” 页。
    </section>

    <section class="card2">
      卡片 2：“全城密接网络查看”，配 “查看完整网络” 按钮，点击直接跳转至 “密接人员展示” 页。
    </section>

    <div id="card3">
      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </div>
    <section class="card4">

      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </section>
    <section class="card5">
      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </section>
    <section class="card6">
      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </section>


  </div>
</template>

<script setup lang="ts" name="Home">


import * as echarts from 'echarts';
import { onMounted } from 'vue';

onMounted(() => {
  // 卡片三：折线图
  var chartDom = document.getElementById('card3');
  var myChart = echarts.init(chartDom);
  var option;

  option = {
    title: {
      text: '1000秒内感染的人数变化'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data: ['Email', 'Union Ads', 'Video Ads', 'Direct', 'Search Engine']
    },
    toolbox: {
      feature: {
        saveAsImage: {}
      }
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      }
    ],
    yAxis: [
      {
        type: 'value'
      }
    ],
    series: [
      {
        name: 'Email',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: [120, 132, 101, 134, 90, 230, 210]
      },
      {
        name: 'Union Ads',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: [220, 182, 191, 234, 290, 330, 310]
      },
      {
        name: 'Video Ads',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: [150, 232, 201, 154, 190, 330, 410]
      },
      {
        name: 'Direct',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: [320, 332, 301, 334, 390, 330, 320]
      },
      {
        name: 'Search Engine',
        type: 'line',
        stack: 'Total',
        label: {
          show: true,
          position: 'top'
        },
        areaStyle: {},
        emphasis: {
          focus: 'series'
        },
        data: [820, 932, 901, 934, 1290, 1330, 1320]
      }
    ]
  };

  option && myChart.setOption(option);
})



</script>

<style scoped>
.home {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  align-items: center;
  display: flex;
  /* 减去导航栏高度 */
  min-height: calc(100vh - 60px);
  /* margin-top: 60px; */
  flex-wrap: wrap;
  font-family: 微软雅黑;
  /* padding: 20px; 增加内边距 */
  /* background-color: #f5f7fa; */
  /* 浅灰背景 */
  color: black;
}
</style>