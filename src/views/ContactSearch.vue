<template>
  <div class="contact-tracing-container">
    <div class="map-container">
      <AMapComponent ref="mapComponent" />
    </div>
    <div class="contact-panel">
      <!-- 顶部工具栏：搜索（grid row 1） -->
      <form class="toolbar" @submit.prevent="handleSearch">
        <input v-model.trim="personId" class="search-input" type="text" placeholder="输入要搜索的 ID（回车或点搜索）"
          aria-label="搜索ID" />
        <button type="submit" class="btn primary">搜索</button>
      </form>

      <!-- 顶部：全选（grid row 2，仅影响“关联ID”） -->
      <div class="select-all-row">
        <label class="select-all">
          <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" :disabled="relatedCount === 0" />
          <span>全选</span>
        </label>
      </div>

      <!-- 细黑线分隔（grid row 3，1px 固定高） -->
      <div class="divider"></div>

      <!-- 结果区（grid row 4，唯一可滚区域） -->
      <div class="results">
        <!-- 空状态 -->
        <div class="empty" v-if="!loading && results.length === 0">
          暂无结果，请输入 ID 后搜索
        </div>

        <!-- 结果卡 -->
        <div v-for="item in results" :key="item.id" class="result-card" :data-type="item.type"
          :class="[{ hidden: !item.visualize }, item.type]">
          <div class="result-main">
            <div class="id">
              <!-- 徽标：主=疑(红)，关=密(黄) -->
              <span class="badge" v-if="item.type === 'base'">疑</span>
              <span class="badge alt" v-else>密</span>
              <span class="id-text">ID：{{ item.id }}</span>
            </div>
          </div>

          <!-- 右侧可见性：主ID无复选框；关联ID有复选框（无文字） -->
          <label v-if="item.type === 'related'" class="toggle-visual" title="切换该路径显示/隐藏">
            <input type="checkbox" v-model="item.visualize" @change="toggleVisualize(item)" />
          </label>
        </div>
      </div>

      <!-- 加载态（grid row 5，自动高度，不参与滚动） -->
      <div class="state" v-if="loading">正在加载…</div>
    </div>
  </div>

</template>

<script setup>

import { ref, computed } from 'vue'
import AMapComponent from '../components/AMapComponent.vue';

/** 搜索输入：ID/关键字 */
const personId = ref('')

/** 顶部“全选/取消全选”（仅关联项参与） */
const selectAll = ref(false)

/**
 * 搜索结果列表
 * - id: string|number
 * - type: 'base' | 'related'
 * - visualize: boolean
 * - locations: Array<{lng,lat,time}>
 */
const results = ref([])

/** 加载态 */
const loading = ref(false)

/** 事件：父组件对接地图组件 */
const emit = defineEmits([
  'draw-batch',           // 搜索后一次性绘制
  'set-visualize',        // 单条可见性切换（仅关联项会触发）
  'set-visualize-batch',  // 批量可见性切换（仅关联项）
  'clear-map',            // 空搜索时清空地图
  'search'                // 可选：同步关键字
])

/** 仅统计“关联项”数量 */
const relatedCount = computed(() =>
  results.value.filter(r => r.type === 'related').length
)

/* 本地假数据（用于 UI/事件联调） */
function buildBaseTrack(baseId) {
  return {
    id: baseId,
    type: 'base',
    visualize: true, // 主ID始终显示
    locations: [
      { lng: 117.0005, lat: 36.6752, time: '2025-11-06T08:00:00+08:00' },
      { lng: 117.0123, lat: 36.6801, time: '2025-11-06T08:30:00+08:00' },
      { lng: 117.0288, lat: 36.6889, time: '2025-11-06T09:10:00+08:00' }
    ]
  }
}

function buildRelatedOverlap(baseId) {
  const others = [
    {
      id: `${baseId}-A`,
      pts: [
        { lng: 117.0100, lat: 36.6790, time: '2025-11-06T08:25:00+08:00' },
        { lng: 117.0120, lat: 36.6800, time: '2025-11-06T08:32:00+08:00' }
      ]
    },
    {
      id: `${baseId}-B`,
      pts: [
        { lng: 117.0250, lat: 36.6870, time: '2025-11-06T09:05:00+08:00' },
        { lng: 117.0285, lat: 36.6890, time: '2025-11-06T09:12:00+08:00' }
      ]
    },
    {
      id: `${baseId}-C`,
      pts: [
        { lng: 117.0040, lat: 36.6765, time: '2025-11-06T08:05:00+08:00' },
        { lng: 117.0065, lat: 36.6778, time: '2025-11-06T08:12:00+08:00' }
      ]
    }
  ]
  return others.map(o => ({
    id: o.id,
    type: 'related',
    visualize: false, // ← 关联项：默认隐藏（满足“搜索结果默认全隐藏”）
    locations: o.pts
  }))
}
/* 搜索：生成主/关联结果；空搜索清空 */
const handleSearch = async () => {
  const kw = personId.value.trim()

  // 空搜索：清空结果并通知地图清除
  if (!kw) {
    results.value = []
    selectAll.value = false
    emit('clear-map')
    return
  }

  loading.value = true
  try {
    const baseTrack = buildBaseTrack(kw)         // 主ID：始终显示
    const related = buildRelatedOverlap(kw)      // 关联ID：默认隐藏

    // 刷新结果
    results.value = [baseTrack, ...related]

    // “全选”仅看关联项；因默认隐藏，selectAll 初值为 false
    const rel = results.value.filter(r => r.type === 'related')
    selectAll.value = rel.length > 0 && rel.every(r => r.visualize)

    // 批量绘制（父层/地图决定可见性表现；我们只给 visualize 状态）
    emit('draw-batch', { baseId: kw, items: results.value })
    emit('search', kw)
  } finally {
    loading.value = false
  }
}

/* 单条可见性切换（仅关联项） */
const toggleVisualize = (item) => {
  emit('set-visualize', { id: item.id, visualize: item.visualize })
  const rel = results.value.filter(r => r.type === 'related')
  selectAll.value = rel.length > 0 && rel.every(r => r.visualize)
}

/* 顶部全选：仅作用于关联项 */
const toggleSelectAll = () => {
  const next = !!selectAll.value
  const rel = results.value.filter(r => r.type === 'related')
  rel.forEach(r => { r.visualize = next })
  emit('set-visualize-batch', rel.map(r => ({ id: r.id, visualize: r.visualize })))
}
</script>

<style scoped>
/* 父容器设置为flex，确保子元素能分配宽度 */
.contact-tracing-container {
  top: 0;
  /* align-items: center; */
  display: flex;
  flex-direction: row;
  
  /* min-height: 100%; */
  /* margin-top: 60px; */
  flex-wrap: nowrap;
  /* padding: 20px; 增加内边距 */
  background-color: #f5f7fa;
  /* 浅灰背景 */
}

/* .control-panel 写在子组件页面 */

/* 地图容器：占满剩余宽度 */
.map-container {
  flex: 1 1 80%;
  /* overflow: hidden; */
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  padding: 0px;
  margin: 0px;
  width: 80%;
  height: 100%;
  overflow-y: auto;
}

/* 关键点：让面板固定在视口内，用 grid 分出“唯一可滚”的结果区 */
.contact-panel {
  /* 固定在可视区域：当页面滚动时，右侧面板不随高度膨胀 */
  /* position: sticky; */
  /* top: 0; */
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

/* 搜索栏（row 1） */
.toolbar {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.search-input {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  outline: none;
}

.search-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.btn {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #d9d9d9;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
}

.btn.primary {
  color: #fff;
  background: #1677ff;
  border-color: #1677ff;
}

.btn.primary:hover {
  background: #2b7bff;
}

/* 全选（row 2） */
.select-all-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 4px 10px;
}

.select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #333;
}

.select-all input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

/* 分隔线（row 3） */
.divider {
  height: 1px;
  background: #000;
  margin: 0 10px;
  /* 与左右留白对齐 */
}

/* 结果列表（row 4）：唯一可滚区域 */
.results {
  overflow-y: auto;
  /* 鼠标滚轮只滚这里 */
  overflow-x: hidden;
  padding: 6px 10px 10px;
  scrollbar-gutter: stable;
}

/* 自定义滚动条（当且仅当需要时才出现；不需要时隐藏） */
.results::-webkit-scrollbar {
  width: 8px;
}

.results::-webkit-scrollbar-track {
  background: transparent;
}

.results::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 6px;
}

.results:hover::-webkit-scrollbar-thumb {
  background: #b5b5b5;
}

/* 空状态 */
.empty {
  padding: 18px 0;
  color: #999;
  text-align: center;
  font-size: 14px;
}

/* 结果卡片 */
.result-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fafafa;
  border: 1px solid #efefef;
  border-radius: 10px;
}

.result-card:hover {
  background: #f6f9ff;
}

.result-card.base {
  border-left: 3px solid #f5222d;
}

/* red for base(疑) */
.result-card.related {
  border-left: 3px solid #fadb14;
}

/* yellow for related(密) */
.result-card.hidden {
  opacity: 0.55;
}

/* ID显示 */
.result-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.id {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 12px;
  color: #fff;
  background: #f5222d;
  /* red for base(疑) */
  user-select: none;
}

.badge.alt {
  background: #fadb14;
  /* yellow for related(密) */
  color: #000;
}

.id-text {
  font-weight: 600;
  color: #222;
}

/* 复选框（仅关联ID有） */
.toggle-visual {
  display: inline-flex;
  align-items: center;
  user-select: none;
}

.toggle-visual input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

/* 加载态（row 5） */
.state {
  padding: 10px;
  text-align: center;
  color: #666;
  font-size: 14px;
  border-top: 1px solid #f0f0f0;
}
</style>
