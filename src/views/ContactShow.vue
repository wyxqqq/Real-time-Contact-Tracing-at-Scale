<template>
  <div class="ContactShow">
    <!-- 地图容器：展示轨迹 -->
    <div class="map-container">
      <AMapComponent ref="mapComponent" />
    </div>

    <!-- 图表区域：展示轨迹分析（如时间-位置变化） -->
    <div class="LineChart">
      <div class="chart-header">
        <h3>密接人员数量随时间的变化</h3>
      </div>
      <div id="trajectory-chart" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts" name="ContactShow">
import { ref, onMounted } from 'vue';
import AMapComponent from '@/components/AMapComponent.vue';
import * as echarts from 'echarts';



// 组件挂载时初始化
onMounted(() => {

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
