<!-- 
高德地图组件
功能：集成高德地图API，提供地图展示和轨迹绘制功能
-->
<template>
  <div id="amap-container"></div>
</template>

<script setup name="AMapConponent">
import { ref, onMounted, onUnmounted } from 'vue';
import AMapLoader from "@amap/amap-jsapi-loader";
// 导入所有接触对结束时刻的位置数据
import AllContactsData from '@/data/all_contacts.json';
const emit = defineEmits(['region-hover-in', 'region-hover-out'])

let map = ref(null);
let markers = [];
// 存储地图上的覆盖物（轨迹线和标记点），用于后续清除
const overlays = ref([]);

// AllContactsData数据预处理
const coordinates = AllContactsData.map(contact => contact.coord);
// 存储地图控件实例
const scaleRef = ref(null);
const toolBarRef = ref(null);
const controlBarRef = ref(null);

/**
 * 初始化高德地图
 * 注意：使用前需要在项目中引入高德地图JS API
 * 示例：在index.html中添加
 * <script src="https://webapi.amap.com/maps?v=2.0&key=您的高德地图key" />
 */
const initMap = () => {
  // vue 3 中的组件形式，需要使用 onMounted 生命周期函数
  // 注意：在使用时，需要在项目中引入高德地图JS API
  window._AMapSecurityConfig = {
    securityJsCode: "b618024676d8467b94e95a21e9da6288",
  };
  AMapLoader.load({
    key: "c4238e9a0f79721313732696bc000ea7", // 申请好的Web端开发者Key，首次调用 load 时必填
    version: "2.0", // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    plugins: ["AMap.Scale", "AMap.ToolBar", "AMap.PolygonEditor", "AMap.ControlBar",
      "AMap.MouseTool", "AMap.PolyEditor", "AMap.PlaceSearch",
      "AMap.Geocoder", "AMap.DistrictLayer", "AMap.Polyline"],
    //需要使用的的插件列表，如比例尺'AMap.Scale'，支持添加多个如：['...','...']
  })
    .then((AMap) => {
      //创建路网图层
      var roadNet = new AMap.TileLayer.RoadNet({
        zIndex: 2, // 路网层级（低于行政区边界，避免遮挡）
        // 可选：自定义路网样式（颜色、宽度等）
        style: {
          'road-stroke': '#666', // 道路颜色（默认深灰，可调整）
          'road-stroke-width': 1, // 道路宽度（默认1px）
          'highway-stroke': '#3388ff', // 高速路颜色
          'highway-stroke-width': 2, // 高速路宽度
          'arterial-stroke': '#444', // 主干道颜色
          'arterial-stroke-width': 1.5 // 主干道宽度
        }
      });

      //创建省市级行政地图
      var distProvince = new AMap.DistrictLayer.Province({
        zIndex: 1, //设置图层层级
        // zooms: [1, 15], //设置图层显示范围
        adcode: "370100", //设置行政区 adcode 济南adcode370100
        depth: 2, //设置数据显示层级，0：显示国家面，1：显示省级，当国家为中国时设置depth为2的可以显示市一级
        styles: {
          // 直接在图层配置中设置样式（更简洁）
          "stroke-width": 2, // 行政区边界线宽
          "stroke": "#3388ff", // 边界颜色（蓝色）
          "fill": "#e6f4ff" // 区域填充色（浅蓝色，原代码错误已修正）
        }
      });

      map.value = new AMap.Map("amap-container", {
        // 设置地图容器id
        viewMode: "2D", // 是否为3D地图模式
        zoom: 13, // 初始化地图级别
        center: [117.00, 36.67], // 初始化地图中心点位置
        terrain: true, //开启地形图
        pitch: 50, //地图俯仰角度，有效范围 0 度- 83 度
        rotateEnable: true, //是否开启地图旋转交互 鼠标右键 + 鼠标画圈移动 或 键盘Ctrl + 鼠标左键画圈移动
        pitchEnable: true, //是否开启地图倾斜交互 鼠标右键 + 鼠标上下移动或键盘Ctrl + 鼠标左键上下移动
        rotation: -15, //初始地图顺时针旋转的角度
        zooms: [1, 20], //地图显示的缩放级别范围
        showLabel: false,// 显示POI
        animateEnable: true,  // 开启地图动画
        layers: [distProvince, roadNet],
        // 1. 新增：配置 Canvas 启用 willReadFrequently，解决性能提示
        renderer: 'canvas',
        renderConfig: {
          canvas: {
            willReadFrequently: true
          }
        },
      })
      // 初始化控件并赋值给ref
      scaleRef.value = new AMap.Scale({ visible: true });
      toolBarRef.value = new AMap.ToolBar({
        visible: true,
        position: { top: '110px', right: '40px' },
      });
      controlBarRef.value = new AMap.ControlBar({
        visible: true,
        position: { top: '10px', right: '10px' }
      });



      // 添加控件
      map.value.addControl(scaleRef.value);
      map.value.addControl(toolBarRef.value);
      map.value.addControl(controlBarRef.value);
      map.value.add(roadNet);


    });
};

/**
 * 通用折线绘制函数
 * @param {Array} path 坐标数组，格式: [[lng, lat], [lng, lat], ...]
 * @param {Object} options 折线样式配置（可选）
 * @returns {AMap.Polyline} 绘制的折线实例
 */
const addPolyline = (path, options = {}) => {
  if (!map.value) {
    console.warn('地图尚未初始化，无法绘制折线');
    return null;
  }

  // 转换坐标为AMap.LngLat对象
  const lngLatPath = path.map(loc => new AMap.LngLat(loc[0], loc[1]));

  // 默认样式配置
  const defaultOptions = {
    strokeWeight: 6,
    strokeColor: "red",
    lineJoin: "round",
    strokeOpacity: 0.5,
    showDir: true,
    zIndex: 50
  };

  // 合并默认配置和用户配置
  const polylineOptions = { ...defaultOptions, ...options };

  // 创建折线实例
  const polyline = new AMap.Polyline({
    path: lngLatPath,
    ...polylineOptions
  });

  // ⭐ 如果有 extData，就挂到 polyline 上，供悬停时识别是哪条区域
  if (polylineOptions.extData) {
    polyline.setExtData(polylineOptions.extData);
  }

  // ⭐ 给“带 regionType 的线”加悬停事件
  polyline.on('mouseover', () => {
    const data = polyline.getExtData && polyline.getExtData();
    if (data && data.regionType) {
      emit('region-hover-in', data);
    }
  });

  polyline.on('mouseout', () => {
    const data = polyline.getExtData && polyline.getExtData();
    if (data && data.regionType) {
      emit('region-hover-out', data);
    }
  });


  // 添加到地图
  map.value.add(polyline);

  // 加入覆盖物管理
  overlays.value.push(polyline);

  // 延迟执行确保折线已完成渲染
  setTimeout(() => {
    // 让地图视图适配折线范围，第二个参数是边距（像素）
    map.value.setFitView([polyline], 100);
  }, 10);

  return polyline;
};


// 组件挂载后初始化地图
onMounted(() => {
  initMap();

});


onUnmounted(() => {
  map.value?.destroy();
  overlays.value.forEach(overlay => overlay.remove()); // 移除覆盖物
  overlays.value = [];
  markers = [];
});

// 暴露组件方法给父组件
defineExpose({
  addPolyline // 通用折线绘制（父组件传坐标）
});

</script>

<style scoped>
#amap-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  /* 浅灰色背景，衬托路网线条 */
}
</style>
