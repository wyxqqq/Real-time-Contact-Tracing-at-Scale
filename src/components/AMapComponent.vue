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

// const props = defineProps({
//   center: {
//     type: Array,
//     default: () => [117.00, 36.67] // 济南中心点
//   },
//   zoom: {
//     type: Number,
//     default: 11
//   }
// });


let map = ref(null);
let marker = ref(null);
// 存储地图上的覆盖物（轨迹线和标记点），用于后续清除
const overlays = ref([]);

// 存储地图控件实例
const scaleRef = ref(null);
const toolBarRef = ref(null);
const controlBarRef = ref(null);
const geocoder = ref(null);

/**
 * 更新地图标记点（新增或移动）
 * @param {Array} lnglat - 坐标数组 [lng, lat]
 */
const updateMarker = (lnglat) => {
  if (!marker.value) {
    // 新增标记点
    marker.value = new AMap.Marker({
      position: lnglat,
      title: '编码结果位置'
    });
    map.value.add(marker.value);
    overlays.value.push(marker.value); // 加入覆盖物管理
  } else {
    // 移动现有标记点
    marker.value.setPosition(lnglat);
  }
};


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
      "AMap.MouseTool", "AMap.PolyEditor", "AMap.PlaceSearch", "AMap.Geocoder", "AMap.DistrictLayer", "AMap.Polyline"],
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
        zooms: [2, 15], //设置图层显示范围
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
        zoom: 11, // 初始化地图级别
        center: [117.00, 36.67], // 初始化地图中心点位置
        terrain: true, //开启地形图
        pitch: 50, //地图俯仰角度，有效范围 0 度- 83 度
        rotateEnable: true, //是否开启地图旋转交互 鼠标右键 + 鼠标画圈移动 或 键盘Ctrl + 鼠标左键画圈移动
        pitchEnable: true, //是否开启地图倾斜交互 鼠标右键 + 鼠标上下移动或键盘Ctrl + 鼠标左键上下移动
        rotation: -15, //初始地图顺时针旋转的角度
        zooms: [2, 20], //地图显示的缩放级别范围
        // showLabel: false,
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
      geocoder.value = new AMap.Geocoder({
        // city 指定进行编码查询的城市，支持传入城市名、adcode 和 citycode
        city: '全国'
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

  // 添加到地图
  map.value.add(polyline);

  // 加入覆盖物管理
  overlays.value.push(polyline);

  return polyline;
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

  // 地图未初始化时直接返回，避免报错
  if (!map.value) {
    console.warn('地图尚未初始化，无法绘制轨迹');
    return;
  }


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


onUnmounted(() => {
  map.value?.destroy();
});

// 暴露组件方法给父组件
defineExpose({
  drawTrajectories,
  drawTrajectories,
  addPolyline, // 通用折线绘制（父组件传坐标）
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