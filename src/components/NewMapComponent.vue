<template>
    <div id="amap-container" class="map-container"></div>
</template>

<script setup name="NewMapComponent">
import { ref, shallowRef, onMounted, onUnmounted, nextTick } from 'vue';
import AMapLoader from "@amap/amap-jsapi-loader";

// 地图核心实例（使用shallowRef减少响应式开销）
// shallowRef 是一个用于创建浅层响应式引用的 API，它属于 Vue 的 reactivity 模块（通常与 ref、reactive 等配合使用）。
let map = shallowRef(null);
let AMapInstance = shallowRef(null);
// 存储覆盖物和坐标数据
const overlays = ref([]);
const coordinates = ref([]);
// 存储动态加载的插件实例
const dynamicPlugins = ref({});
// 添加时间过滤相关变量
const filterTime = ref(599);

// 防抖函数  核心作用是控制高频触发的函数在指定时间内只执行一次
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * 初始化高德地图
 */
// async 是用于声明异步函数的关键字，它配合 await 关键字一起使用
const initMap = async () => {
    try {
        // 异步注入安全配置（避免阻塞初始化）
        window._AMapSecurityConfig = window._AMapSecurityConfig || {
            securityJsCode: "b618024676d8467b94e95a21e9da6288",
        };

        // 只加载核心插件，非必要插件按需加载
        AMapInstance.value = await AMapLoader.load({
            key: "c4238e9a0f79721313732696bc000ea7",
            version: "2.0",
            plugins: [
                "AMap.MassMarks",
                "AMap.Polyline" // 核心功能插件
            ],
        });

        await initializeMapDirectly();
        // 异步加载数据（不阻塞地图渲染）
        await loadAndProcessData();
    } catch (error) {
        console.error('地图初始化失败:', error);
    }
};

/**
 * 直接初始化地图实例
 */
const initializeMapDirectly = () => {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            map.value = new AMapInstance.value.Map("amap-container", {
                viewMode: "2D",
                zoom: 11,
                center: [117.00, 36.67],
                terrain: false,
                pitch: 0,
                rotateEnable: false,
                pitchEnable: false,
                renderer: 'canvas', // 优化渲染性能
                zooms: [1, 20],
                showLabel: false,
            });

            // 地图渲染完成后初始化基础图层
            map.value.on('complete', () => {
                initializeBaseLayers();
                // 绑定视野变化事件（用于按需渲染）
                map.value.on('zoomend', debounce(handleViewChange, 300));
                map.value.on('moveend', debounce(handleViewChange, 300));
                resolve();
            });
        });
    });
};

/**
 * 初始化基础图层（只加载核心图层）
 */
const initializeBaseLayers = () => {
    if (!map.value) return;

    // 简化的路网图层
    const roadNet = new AMapInstance.value.TileLayer.RoadNet({ zIndex: 2 });
    map.value.add(roadNet);
    overlays.value.push(roadNet);
    //创建省市级行政地图
    const distProvince = new AMap.DistrictLayer.Province({
        zIndex: 1, //设置图层层级
        zooms: [1, 20], //设置图层显示范围
        adcode: "370100", //设置行政区 adcode 济南adcode370100
        depth: 2, //设置数据显示层级，0：显示国家面，1：显示省级，当国家为中国时设置depth为2的可以显示市一级
        styles: {
            // 直接在图层配置中设置样式（更简洁）
            "stroke-width": 2, // 行政区边界线宽
            "stroke": "#3388ff", // 边界颜色（蓝色）
            "fill": "#e6f4ff" // 区域填充色（浅蓝色，原代码错误已修正）
        }
    });
    map.value.add(distProvince);
    overlays.value.push(distProvince);

    // 按需加载控件（点击地图时加载）
    map.value.on('click', loadMapControlsOnce);
};

/**
 * 一次性加载地图控件（避免初始加载开销）
 */
const loadMapControlsOnce = debounce(async () => {
    if (dynamicPlugins.value.scale) return; // 已加载则返回

    // 动态加载控件插件
    await AMapInstance.value.plugin(['AMap.Scale', 'AMap.ToolBar']);

    // 创建并添加控件
    dynamicPlugins.value.scale = new AMapInstance.value.Scale({ visible: true });
    dynamicPlugins.value.toolBar = new AMapInstance.value.ToolBar({
        visible: true,
        position: { top: '110px', right: '40px' },
    });

    map.value.addControl(dynamicPlugins.value.scale);
    map.value.addControl(dynamicPlugins.value.toolBar);

    // 移除点击事件（只加载一次）
    map.value.off('click', loadMapControlsOnce);
}, 300);

// 添加接收过滤时间的方法
const setFilterTime = (time) => {
    filterTime.value = time;
    handleViewChange(); // 触发重新渲染
};

/**
 * 异步加载并处理坐标数据（使用Web Worker）
 */
const loadAndProcessData = async () => {
    try {
        const { default: AllContactsData } = await import('@/data/all_contacts.json');

        const worker = new Worker(new URL('@/workers/coordinateProcessor.js', import.meta.url));

        return new Promise((resolve) => {
            worker.postMessage({ data: AllContactsData });
            worker.onmessage = (e) => {
                // 确保每条数据都包含time字段
                coordinates.value = e.data.map(item => ({
                    ...item,
                    time: item.time || 0, // 假设原始数据中有time字段
                    name: item.id1
                }));
                initializeMassMarks();
                worker.terminate();
                resolve();
            };
            // ... 错误处理 ...
        });
    } catch (error) {
        console.error('数据加载失败:', error);
    }
};

/**
 * 初始化大量点标记（按需渲染+分批加载）
 */
const initializeMassMarks = debounce(() => {
    if (!map.value || !coordinates.value.length) return;

    const style = {
        url: 'https://webapi.amap.com/images/mass/mass0.png',
        anchor: new AMapInstance.value.Pixel(4, 4),
        size: new AMapInstance.value.Size(6, 6),
        zIndex: 111,
    };

    // 只渲染当前视野内的点
    const visibleData = getVisibleCoordinates(coordinates.value);

    // 分批加载可见点
    loadMarksInBatches(visibleData, style);
}, 300);

/**
 * 根据当前视野过滤可见坐标
 */
const getVisibleCoordinates = (data) => {
    if (!map.value) return data;

    const bounds = map.value.getBounds();
    return data.filter(item => {
        // 坐标可见性判断
        const [lng, lat] = item.lnglat;
        const inBounds = bounds.contains(new AMapInstance.value.LngLat(lng, lat));

        // 时间可见性判断
        const inTimeRange =  (filterTime.value > 0 && filterTime.value <= 600) || item.time <= filterTime.value;

        return inBounds && inTimeRange;
    });
};

/**
 * 分批加载标记点
 */
const loadMarksInBatches = (data, style) => {
    const batchSize = getBatchSizeByDevice(); // 自适应批次大小
    let currentBatch = 0;

    const loadBatch = () => {
        const start = currentBatch * batchSize;
        const end = Math.min(start + batchSize, data.length);
        const batchData = data.slice(start, end);

        if (batchData.length === 0) return;

        const massMarks = new AMapInstance.value.MassMarks(batchData, {
            opacity: 0.8,
            zIndex: 111,
            cursor: 'pointer',
            style
        });

        // 绑定事件（并记录用于后续解绑）
        const infoWindow = new AMapInstance.value.InfoWindow({
            offset: new AMapInstance.value.Pixel(0, -15),
        });

        const handleMouseOver = (e) => {
            infoWindow.setContent(`ID: ${e.data.name}`);
            infoWindow.open(map.value, e.data.lnglat);
        };

        const handleMouseOut = () => {
            infoWindow.close();
        };

        massMarks.on("mouseover", handleMouseOver);
        massMarks.on("mouseout", handleMouseOut);

        // 存储事件用于清理
        massMarks.__events = { handleMouseOver, handleMouseOut, infoWindow };
        massMarks.setMap(map.value);
        overlays.value.push(massMarks);

        currentBatch++;
        if (end < data.length) {
            requestAnimationFrame(loadBatch); // 使用requestAnimationFrame优化渲染
        }
    };

    loadBatch();
};

/**
 * 根据设备性能获取批次大小
 */
const getBatchSizeByDevice = () => {
    // 低端设备减小批次大小
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        return 1000;
    }
    return 2000;
};

/**
 * 视野变化时重新渲染可见点
 */
const handleViewChange = () => {
    // 先清除现有标记点
    clearMassMarks();
    // 重新加载可见点
    initializeMassMarks();
};

/**
 * 清除所有标记点
 */
const clearMassMarks = () => {
    overlays.value = overlays.value.filter(overlay => {
        if (overlay instanceof AMapInstance.value.MassMarks) {
            // 解绑事件
            if (overlay.__events) {
                overlay.off('mouseover', overlay.__events.handleMouseOver);
                overlay.off('mouseout', overlay.__events.handleMouseOut);
                overlay.__events.infoWindow.close();
            }
            overlay.setMap(null);
            return false;
        }
        return true;
    });
};

/**
 * 绘制折线（带防抖）
 */
const addPolyline = (path, options = {}) => {
    if (!map.value) {
        console.warn('地图尚未初始化，无法绘制折线');
        return null;
    }

    return debounce(() => {
        const lngLatPath = path.map(loc => new AMapInstance.value.LngLat(loc[0], loc[1]));

        const defaultOptions = {
            strokeWeight: 6,
            strokeColor: "red",
            lineJoin: "round",
            strokeOpacity: 0.5,
            zIndex: 50
        };

        const polyline = new AMapInstance.value.Polyline({
            path: lngLatPath,
            ...defaultOptions,
            ...options
        });

        map.value.add(polyline);
        overlays.value.push(polyline);
        return polyline;
    }, 50)();
};

/**
 * 清理资源（优化内存管理）
 */
const cleanup = () => {
    // 清除覆盖物
    overlays.value.forEach(overlay => {
        try {
            // 解绑事件
            if (overlay.__events) {
                overlay.off('mouseover', overlay.__events.handleMouseOver);
                overlay.off('mouseout', overlay.__events.handleMouseOut);
                overlay.__events.infoWindow?.close();
            }
            overlay.setMap?.(null);
            overlay.remove?.();
        } catch (e) {
            console.warn('清理覆盖物时出错:', e);
        }
    });
    overlays.value = [];

    // 清除动态插件
    Object.values(dynamicPlugins.value).forEach(plugin => {
        map.value?.removeControl(plugin);
    });
    dynamicPlugins.value = {};

    // 销毁地图
    if (map.value) {
        try {
            map.value.off('complete');
            map.value.off('zoomend', handleViewChange);
            map.value.off('moveend', handleViewChange);
            map.value.off('click', loadMapControlsOnce);
            map.value.destroy();
            map.value = null;
        } catch (e) {
            console.warn('销毁地图时出错:', e);
        }
    }
};





// 组件生命周期
onMounted(() => {
    nextTick(() => {
        initMap();
    });
});

onUnmounted(() => {
    cleanup();
});

// 暴露方法给父组件
defineExpose({
    addPolyline,
    clearMassMarks,
    setFilterTime // 新增：暴露时间过滤方法
});
</script>

<style scoped>
.map-container {
    width: 100%;
    height: 100%;
    min-height: 600px;
    /* 确保地图有足够高度 */
}
</style>