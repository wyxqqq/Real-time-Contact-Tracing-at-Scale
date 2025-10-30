<!-- 
高德地图组件
功能：集成高德地图API，提供地图展示和轨迹绘制功能
-->
<template>
  <div id="amap-container"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  center: {
    type: Array,
    default: () => [116.397428, 39.90923] // 默认北京中心点
  },
  zoom: {
    type: Number,
    default: 12
  }
});

const map = ref(null);

/**
 * 初始化高德地图
 * 注意：使用前需要在项目中引入高德地图JS API
 * 示例：在index.html中添加
 * <script src="https://webapi.amap.com/maps?v=2.0&key=您的高德地图key" />
 */
const initMap = () => {
  // 创建地图实例
  map.value = new AMap.Map('amap-container', {
    zoom: props.zoom,    // 地图缩放级别
    center: props.center // 地图中心点坐标
  });
  
  // 可以在此添加地图控件和插件
  // 例如：map.value.addControl(new AMap.ControlBar())
};

/**
 * 绘制联系人轨迹
 * @param {Array} contacts - 联系人列表，包含位置信息
 */
const drawTrajectories = (contacts) => {
  console.log('绘制轨迹:', contacts);
  // 实际地图绘制逻辑
  // 1. 清除现有覆盖物
  // 2. 根据contacts数据绘制轨迹线和标记点
};

// 组件挂载后初始化地图
onMounted(() => {
  initMap();
});

// 暴露组件方法给父组件
defineExpose({
  drawTrajectories
});

</script>

<style scoped>
#amap-container {
  width: 100%;
  height: 100%;
}
</style>
