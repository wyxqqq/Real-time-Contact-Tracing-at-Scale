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
    default: () => [117.00, 36.67] // 济南中心点
  },
  zoom: {
    type: Number,
    default: 12
  }
});

const map = ref(null);
// 存储地图上的覆盖物（轨迹线和标记点），用于后续清除
const overlays = ref([]);

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
  // 添加地图控件：比例尺
  map.value.addControl(new AMap.Scale());
  // 添加地图控件：缩放控件
  map.value.addControl(new AMap.ControlBar());

};


/**
 * 绘制联系人轨迹
 * @param {Array} contacts - 联系人列表，包含位置信息
 * 每个联系人格式示例：{
 *   id: '123',
 *   name: '张三',
 *   locations: [
 *     { lng: 116.397428, lat: 39.90923, time: '2023-10-01 08:00' },
 *     { lng: 116.407428, lat: 39.91923, time: '2023-10-01 09:00' }
 *   ]
 * }
 */
const drawTrajectories = (contacts) => {
  console.log('绘制轨迹:', contacts);
  // 实际地图绘制逻辑
  // 1. 清除现有覆盖物
  // 2. 根据contacts数据绘制轨迹线和标记点


  // 1. 清除现有覆盖物
  if (overlays.value.length > 0) {
    // 从地图上移除所有覆盖物
    map.value.remove(overlays.value);
    // 清空覆盖物数组
    overlays.value = [];
  }

  // 2. 检查联系人数据是否有效
  if (!contacts || contacts.length === 0) {
    console.warn('没有可绘制的联系人数据');
    return;
  }

  // 3. 定义不同联系人的轨迹颜色（避免颜色重复）
  const colors = ['#3366cc', '#dc3912', '#ff9900', '#109678', '#990099', '#0099c6'];

  // 4. 遍历每个联系人绘制轨迹
  contacts.forEach((contact, index) => {
    // 跳过没有位置信息的联系人
    if (!contact.locations || contact.locations.length < 2) {
      console.warn(`联系人${contact.name}没有足够的位置信息`);
      return;
    }

    // 提取位置坐标数组，格式：[[lng, lat], [lng, lat], ...]
    const path = contact.locations.map(loc => [loc.lng, loc.lat]);

    // 5. 创建轨迹线
    const polyline = new AMap.Polyline({
      path: path, // 轨迹路径
      strokeColor: colors[index % colors.length], // 线条颜色（循环使用预设颜色）
      strokeWeight: 6, // 线条宽度
      strokeOpacity: 0.8, // 线条透明度
      zIndex: 50, // 图层层级
      // 线条样式：虚线 [实线长度, 空白长度]，实线可设为null
      strokeStyle: null
    });

    // 6. 创建起点标记
    const startMarker = new AMap.Marker({
      position: path[0], // 起点坐标
      title: `${contact.name} - 起点`, // 鼠标悬停提示
      icon: new AMap.Icon({
        size: new AMap.Size(24, 24), // 图标大小
        image: 'https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
        imageSize: new AMap.Size(24, 24)
      }),
      zIndex: 100 // 标记层级（高于轨迹线）
    });

    // 7. 创建终点标记（使用不同图标）
    const endMarker = new AMap.Marker({
      position: path[path.length - 1], // 终点坐标
      title: `${contact.name} - 终点`, // 鼠标悬停提示
      icon: new AMap.Icon({
        size: new AMap.Size(24, 24),
        image: 'https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
        imageSize: new AMap.Size(24, 24)
      }),
      zIndex: 100
    });

    // 8. 为轨迹线添加点击事件（显示联系人信息）
    polyline.on('click', () => {
      console.log(`点击了${contact.name}的轨迹`);
      // 实际项目中可显示更详细的信息弹窗
    });

    // 9. 将覆盖物添加到地图
    map.value.add([polyline, startMarker, endMarker]);

    // 10. 保存覆盖物引用，用于后续清除
    overlays.value.push(polyline, startMarker, endMarker);
  });

  // 11. 调整地图视野，显示所有轨迹
  if (overlays.value.length > 0) {
    map.value.setFitView(overlays.value, false, [50, 50]);
  }

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