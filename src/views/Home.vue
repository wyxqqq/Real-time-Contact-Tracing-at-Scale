<template>
  <div class="home">
    <header>
      数据范围与系统价值提示（顶部横幅）<br>
      明确标注数据时间范围：“当前展示 1000 秒内济南市人员密接流动数据”，避免用户误解数据跨度。<br>
      简洁传递价值：“基于实时位置分析，精准识别密接 / 次密接，可视化呈现传播轨迹”。<br>
    </header>
    <section id="card1">
      <h1>个人密接轨迹查询</h1>
      <RouterLink :to="{ name: 'ContactTracingView' }" active-class="class-active">查询</RouterLink>
      卡片1：“个人密接轨迹查询”，配 “输入 ID 查询” 按钮，点击直接跳转至 “密接人员轨道绘制” 页。
    </section>

    <section id="card2">
      <h1>密接人员展示</h1>
      <RouterLink :to="{ name: 'ContactShow' }" active-class="class-active">密接人员展示</RouterLink>
      卡片 2：“全城密接网络查看”，配 “查看完整网络” 按钮，点击直接跳转至 “密接人员展示” 页。
    </section>

    <div id="card3">

    </div>
    <section id="card4">

      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </section>
    <section id="card5">
      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </section>
    <section id="card6">
      关键指标卡片（3-4 个）：用大数字直观展示，比如 “总密接次数”“涉及人员数”“次密接人数”“高密接区域数”。
    </section>


  </div>
</template>

<script setup lang="ts" name="Home">


import * as echarts from 'echarts';
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router'

onMounted(() => {
  // 卡片三：折线图
  // 1. 初始化图表实例
  const chartDomCard3 = document.getElementById('card3');
  const myChartCard3 = echarts.init(chartDomCard3);

  // 2. 模拟数据（符合传染病传播的 S 型增长规律）
  // x轴：时间（0~1000秒，每10秒一个数据点）
  // y轴：感染人数（使用逻辑斯蒂增长模型模拟真实传播趋势）
  const generateCard3Data = () => {
    const xData = [];
    const yData = [];
    const maxPeople = 5000; // 总易感人群数量
    const growthRate = 0.01; // 传播速率
    const midPoint = 500; // 增长拐点时间（秒）

    // 生成x轴时间数据（0~1000秒，步长10秒）
    for (let t = 0; t <= 1000; t += 10) {
      xData.push(t);

      // 逻辑斯蒂增长公式：y = K / (1 + e^(-r(t - t0)))
      const infectionCount = Math.round(
        maxPeople / (1 + Math.exp(-growthRate * (t - midPoint)))
      );
      yData.push(infectionCount);
    }
    return { xData, yData };
  };

  // 获取模拟数据
  const { xData, yData } = generateCard3Data();

  // 3. 图表配置项
  const optionCard3 = {
    // 标题配置
    title: {
      text: '感染人数时间动态变化',
      subtext: '时间范围：0~1000秒',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 600
      },
      subtextStyle: {
        fontSize: 14,
        color: '#666'
      }
    },

    // 图例配置
    legend: {
      data: ['感染人数'],
      top: 50,
      left: 'center'
    },

    // 网格配置（图表与容器的边距）
    grid: {
      left: '10%',
      right: '5%',
      bottom: '15%',
      top: '15%',
      containLabel: true // 包含坐标轴标签
    },

    // 提示框配置（鼠标悬浮显示）
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow' // 阴影指示器
      },
      formatter: function (params) {
        // 自定义提示框内容
        return `时间：${params[0].data} 秒<br/>感染人数：${params[0].value} 人`;
      },
      textStyle: {
        fontSize: 14
      }
    },

    // x轴配置（时间轴）
    xAxis: {
      type: 'value',
      name: '时间（秒）',
      nameLocation: 'middle',
      nameGap: 30, // 轴名称与轴线的距离
      nameTextStyle: {
        fontSize: 14,
        fontWeight: 500
      },
      min: 0,
      max: 1000,
      axisLabel: {
        formatter: '{value}s', // 标签格式
        interval: 100 // 每100秒显示一个标签
      },
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#eee'
        }
      }
    },

    // y轴配置（感染人数轴）
    yAxis: {
      type: 'value',
      name: '感染人数（人）',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: 500
      },
      axisLabel: {
        formatter: '{value}人'
      },
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#eee'
        }
      }
    },

    // 系列数据配置（折线图）
    series: [
      {
        name: '感染人数',
        type: 'line',
        data: yData.map((y, index) => [xData[index], y]), // 数据格式：[x, y]
        smooth: true, // 平滑曲线
        symbol: 'circle', // 数据点样式：圆形
        symbolSize: 6, // 数据点大小
        lineStyle: {
          width: 3,
          color: '#e74c3c' // 折线颜色（红色系，符合感染主题）
        },
        itemStyle: {
          color: '#e74c3c',
          borderColor: '#fff',
          borderWidth: 2
        },
        areaStyle: {
          // 填充区域（渐变效果）
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(231,76,60,0.3)' },
            { offset: 1, color: 'rgba(231,76,60,0.05)' }
          ])
        },
        emphasis: {
          // 鼠标悬浮时的样式
          itemStyle: {
            symbolSize: 10,
            color: '#c0392b'
          }
        }
      }
    ]
  };

  optionCard3 && myChartCard3.setOption(optionCard3);

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

#card1 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

#card2 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

#card3 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

#card4 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

#card5 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

#card6 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

body {
  font-family: "Microsoft YaHei", sans-serif;
  background-color: #f9f9f9;
}

h1 {
  text-align: center;
  color: #333;
  margin-top: 20px;
}
</style>