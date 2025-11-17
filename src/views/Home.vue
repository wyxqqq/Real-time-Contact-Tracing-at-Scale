<template>
  <div class="home">
    <!-- 视频卡片容器1 -->
    <div class="video-card" @click="handleCardClick1">
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
    <div class="video-card" @click="handleCardClick2">
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



  </div>
</template>

<script setup name="Home">


import * as echarts from 'echarts';
import { onMounted, ref } from 'vue';


const videoUrl1 = '/ContactSearch';
const videoUrl2 = '/ContactShow';

const title1 = ref("个人轨迹查询");
const title2 = ref("密接人员展示");

/**
 * 处理卡片点击事件
 */
const handleCardClick1 = () => {
  window.location.href = videoUrl1;
};
const handleCardClick2 = () => {
  window.location.href = videoUrl2;
};

onMounted(() => {

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