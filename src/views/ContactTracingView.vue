<!-- 
联系人追踪主视图
功能：协调地图组件和搜索组件，实现联系人追踪功能
子组件：
- AMapComponent: 高德地图展示和轨迹绘制
- ContactSearch: 联系人搜索和选择
-->
<template>
  <div class="contact-tracing-container">
    <ContactSearch @search="handleSearch" @draw="handleDraw" />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import AMapComponent from '@/components/AMapComponent.vue';
import ContactSearch from '@/components/ContactSearch.vue';

const mapComponent = ref(null);

/**
 * 处理搜索事件
 * @param {string} personId - 搜索的人员ID
 */
const handleSearch = (personId) => {
  console.log('搜索人员ID:', personId);
  // 可以在此添加搜索后的处理逻辑
};

/**
 * 处理绘制轨迹事件
 * @param {Array} contacts - 选中的联系人列表
 */
const handleDraw = (contacts) => {
  mapComponent.value.drawTrajectories(contacts);
};
</script>

<style scoped>
/* 父容器设置为flex，确保子元素能分配宽度 */
.contact-tracing-container {
  top: 0;
  /* align-items: center; */
  display: flex;
  /* min-height: 100%; */
  /* margin-top: 60px; */
  flex-wrap: wrap;
  /* padding: 20px; 增加内边距 */
  background-color: #f5f7fa;
  /* 浅灰背景 */
}
</style>