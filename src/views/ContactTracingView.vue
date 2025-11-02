<!-- 
联系人追踪主视图
功能：协调地图组件和搜索组件，实现联系人追踪功能
子组件：
- AMapComponent: 高德地图展示和轨迹绘制
- ContactSearch: 联系人搜索和选择
-->
<template>
  <div class="contact-tracing-container">
    <div class="map-container">
      <AMapComponent ref="mapComponent" />
    </div>
    <div class="control-panel">
      <ContactSearch @search="handleSearch" @draw="handleDraw" />
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';
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
  display: flex;
  /* height: 100vh; */
  /* padding: 20px; */
  /* gap: 20px; */
}


.control-panel {
  flex: 1 1 20%;
  width: 20%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 25px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

}

/* 地图容器：占满剩余宽度 */
.map-container {
  flex: 0 0 80%;
  /* overflow: hidden; */
  padding: 0px;
  margin: 0px;
  width: 80%;
  height: 100%;
}
</style>