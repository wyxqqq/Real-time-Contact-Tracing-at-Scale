<template>
  <div class="ContactShow">
    <div class="map-container">
      <AMapComponent ref="mapComponent" />
    </div>
    <div class="LineChart"></div>
  </div>
</template>

<script setup lang="ts" name="Home">
import AMapComponent from '@/components/AMapComponent.vue';

</script>

<style scoped>
.ContactShow {
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

/* 地图容器：占满剩余宽度 */
.map-container {
  flex: 1 1 50%;
  /* overflow: hidden; */
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  padding: 0px;
  margin: 0px;
  width: 50%;
  height: 100%;
  overflow-y: auto;
}

.LineChart {
  /* 视口高度 */
  min-height: 100%;
  overflow: hidden;
  /* 自身不滚，内部 .results 滚 */

  /* 用 grid 严格划分行高：toolbar / selectall / divider / results / state */
  display: grid;
  grid-template-rows: auto auto 1px minmax(0, 1fr) auto;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  min-width: 300px;
}
</style>