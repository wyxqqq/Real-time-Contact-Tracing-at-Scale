<template>
  <div class="home">
    <!-- 视频卡片容器1 -->
    <div class="video-card" @click="handleCardClick">
      <!-- 封面区域 -->
      <div class="video-card__cover">
        <img src="../images/个人轨迹查询.png" alt="{{ title1 }}" class="video-card__image" loading="lazy">
      </div>

      <!-- 信息区域 -->
      <div class="video-card__info">
        <!-- 标题 -->
        <h3 class="video-card__title" title="{{ title1 }}">
          {{ title1 }}
        </h3>
      </div>
    </div>
    <!-- 视频卡片容器2 -->
    <div class="video-card" @click="handleCardClick">
      <!-- 封面区域 -->
      <div class="video-card__cover">
        <img src="../images/密接人员展示.png" alt="{{ title2 }}" class="video-card__image" loading="lazy">
      </div>

      <!-- 信息区域 -->
      <div class="video-card__info">
        <!-- 标题 -->
        <h3 class="video-card__title" title="{{ title2 }}">
          {{ title2 }}
        </h3>
      </div>
    </div>


    <div id="card3">

    </div>



  </div>
</template>

<script setup lang="ts" name="Home">


import * as echarts from 'echarts';
import { onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router'
import { computed } from 'vue';

// 组件Props定义
const props = defineProps<{
  // 视频封面图URL
  coverUrl: string;
  // 视频标题
  title: string;
  // 视频时长（秒数）
  duration: number;
  // 视频跳转链接
  // videoUrl:string;
  // 播放量（可选）
  viewCount?: number;
  // UP主名称（可选）
  author?: string;
  // 是否显示额外信息（播放量、UP主）
  showExtraInfo?: boolean;
  // 是否宽屏模式（Bilibili有不同尺寸的卡片）
  wideMode?: boolean;
  // 是否在新窗口打开
  targetBlank?: boolean;
}>();

const videoUrl = '/ContactTracingView';
const coverUrl = '@/images/VCTCN选手签名.jpg';
const title1 = ref("个人轨迹查询");
const title2 = ref("密接人员展示");
/**
 * 格式化时长显示（00:00格式）
 */
const formatDuration = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

/**
 * 格式化播放量显示（万/亿单位）
 */
const formatViewCount = (count?: number): string => {
  if (!count) return '0';
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(1)}亿`;
  } else if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toString();
};

/**
 * 处理卡片点击事件
 */
const handleCardClick = () => {
  if (props.targetBlank) {
    window.open(videoUrl, '_blank');
  } else {
    window.location.href = videoUrl;
  }
};

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
body {
  font-family: "Microsoft YaHei", sans-serif;
  background-color: #f9f9f9;
}

h1 {
  text-align: center;
  color: #333;
  margin-top: 20px;
}

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


#card3 {
  width: 90%;
  height: 600px;
  margin: 30px auto;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}


/* 基础卡片样式 */
.video-card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  cursor: pointer;
  width: 50vh;
  margin: 25px;
}

/* 卡片悬停效果 */
.video-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

/* 悬停时播放按钮显示 */
.video-card:hover .video-card__play-btn {
  opacity: 1;
  transform: scale(1);
}

/* 悬停时封面图缩放 */
.video-card:hover .video-card__image {
  transform: scale(1.03);
}

/* 悬停时标题颜色变化 */
.video-card:hover .video-card__title {
  color: #00a1d6;
}

/* 封面区域 */
.video-card__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  /* Bilibili标准卡片比例 */
  overflow: hidden;
}

/* 封面图片 */
.video-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

/* 时长标签（右下角） */
.video-card__duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  padding: 1px 4px;
  border-radius: 3px;
  z-index: 1;
}

/* 播放按钮（悬停显示） */
.video-card__play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  width: 40px;
  height: 40px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 1;
}

.video-card__play-btn i {
  margin-left: 1px;
  /* 播放图标居中微调 */
}

/* 信息区域 */
.video-card__info {
  padding: 10px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 标题样式 */
.video-card__title {
  font-size: 14px;
  font-weight: 500;
  color: #18191c;
  line-height: 1.4;
  display: -webkit-box;
  /* -webkit-line-clamp: 2; */
  /* 最多显示2行 */
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 6px 0;
  transition: color 0.2s ease;
}

/* 元信息（播放量、UP主） */
.video-card__meta {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #99a2aa;
  gap: 12px;
}

.video-card__view,
.video-card__author {
  display: flex;
  align-items: center;
  gap: 4px;
}

.video-card__view i,
.video-card__author i {
  font-size: 11px;
}

/* 响应式调整 - 移动端 */
@media (max-width: 768px) {
  .video-card .video-card__info {
    padding: 8px 6px;
  }

  .video-card .video-card__title {
    font-size: 13px;
    /* -webkit-line-clamp: 1; */
    /* 移动端显示1行 */
  }

  .video-card .video-card__meta {
    gap: 8px;
    font-size: 11px;
  }
}
</style>