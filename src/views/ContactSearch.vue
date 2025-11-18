<template>
  <div class="contact-tracing-container">
    <!-- 左侧地图 -->
    <div class="map-container">
      <AMapComponent ref="mapComponent" />
    </div>

    <!-- 右侧搜索 / 事件列表 -->
    <div class="contact-panel">
      <!-- 顶部工具栏：搜索 -->
      <form class="toolbar" @submit.prevent="handleSearch">
        <input
          v-model.trim="personId"
          class="search-input"
          type="text"
          placeholder="输入要搜索的 ID（回车或点搜索）"
          aria-label="搜索ID"
        />
        <button type="submit" class="btn primary">搜索</button>
      </form>

      <!-- 顶部：全选（仅影响非主疑：密接 + 次密接） -->
      <div class="select-all-row">
        <label class="select-all">
          <input
            type="checkbox"
            :checked="selectAll"
            @change="toggleSelectAll"
            :disabled="toggleableCount === 0"
          />
          <span>全选</span>
        </label>
      </div>

      <!-- 细黑线分隔 -->
      <div class="divider"></div>

      <!-- 结果区（唯一可滚区域） -->
      <div class="results">
        <!-- 空状态 -->
        <div class="empty" v-if="!loading && visibleResults.length === 0">
          暂无结果，请输入 ID 后搜索
        </div>

        <!-- 事件卡（疑 / 密 / 次） -->
        <div
          v-for="item in visibleResults"
          :key="item.id"
          class="result-card"
          :data-type="item.type"
          :class="[item.type, { hidden: !item.visualize, active: item.visualize }]"
          @click="onCardClick(item)"
        >
          <!-- 左侧主体，根据 level 缩进 -->
          <div
            class="result-main"
            :style="{ paddingLeft: item.type === 'secondary' ? '24px' : '8px' }"
          >
            <!-- 徽标：疑 / 密 / 次 -->
            <span
              v-if="item.type === 'base'"
              class="badge badge-base"
            >疑</span>
            <span
              v-else-if="item.type === 'close'"
              class="badge badge-close"
            >密</span>
            <span
              v-else
              class="badge badge-secondary"
            >次</span>

            <span class="id-text">ID：{{ item.id }}</span>
          </div>

          <!-- 右侧展开键：仅密接有 -->
          <button
            v-if="item.type === 'close'"
            class="expand-btn"
            @click.stop="toggleExpand(item)"
          >
            {{ item.expanded ? '收起' : '展开' }}
          </button>
        </div>
      </div>

      <!-- 加载态 -->
      <div class="state" v-if="loading">正在加载…</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AMapComponent from '../components/AMapComponent.vue'

// 地图组件实例（以后你要直接调用 addPolyline 等，可以用它）
const mapComponent = ref(null)

// 示例：绘制多条折线（保留原来的demo函数，方便你以后测试）
const drawMultiplePolylines = () => {
  const path1 = [
    [117.049206, 36.659856],
    [117.065411, 36.659021],
    [116.926597, 36.662657]
  ]

  const path2 = [
    [117.149206, 36.759856],
    [117.165411, 36.759021],
    [117.226597, 36.762657]
  ]

  if (mapComponent.value) {
    mapComponent.value.addPolyline(path1)
    mapComponent.value.addPolyline(path2, {
      strokeColor: '#00ff00',
      strokeWeight: 4,
      showDir: false
    })
  }
}

/** 搜索输入：ID/关键字 */
const personId = ref('')

/** 顶部“全选/取消全选”（仅非主疑参与） */
const selectAll = ref(false)

/**
 * 搜索结果列表（完整接触图）
 * - id: string
 * - type: 'base' | 'close' | 'secondary'
 * - level: 0 | 1 | 2（用于缩进）
 * - parentId: string | null
 * - visualize: boolean（是否显示）
 * - expanded: boolean（仅密接有意义）
 * - locations: Array<{lng,lat,time}>
 */
const results = ref([])

/** 加载态 */
const loading = ref(false)

/** 对外事件（目前父路由没监听，但保留接口） */
const emit = defineEmits([
  'draw-batch',           // 搜索后一次性绘制
  'set-visualize',        // 单条可见性切换
  'set-visualize-batch',  // 批量可见性切换
  'clear-map',            // 空搜索时清空地图
  'search'                // 通知搜索关键字
])

/**
 * 计算属性：visibleResults
 * - 主疑 + 密接：始终渲染
 * - 次密接：仅当父密接 expanded === true 时渲染
 *  （真正“显示/隐藏”靠 visualize 控制，active/hidden 只做视觉样式）
 */
const visibleResults = computed(() => {
  const all = results.value
  const ordered = []

  // 1. 主疑（如果有的话，先放最上面）
  const base = all.find((item) => item.type === 'base')
  if (base) {
    ordered.push(base)
  }

  // 2. 按顺序插入：密接 → 它的次密接
  const closeList = all.filter((item) => item.type === 'close')
  closeList.forEach((close) => {
    // 先放这条密接本身
    ordered.push(close)

    // 如果没展开，就不显示它的次密接
    if (!close.expanded) return

    // 找到所有属于该密接的次密接
    const children = all.filter(
      (sec) => sec.type === 'secondary' && sec.parentId === close.id
    )

    // 插在密接下面
    ordered.push(...children)
  })

  // 3. 如果没有主疑（理论上不会），就把所有非 close/secondary 的也放进去兜底
  if (!base) {
    const others = all.filter(
      (item) => item.type !== 'close' && item.type !== 'secondary'
    )
    // 避免重复 push
    others.forEach((item) => {
      if (!ordered.includes(item)) {
        ordered.unshift(item)
      }
    })
  }

  return ordered
})


/** 被“全选”控制的条目数量：所有非主疑 */
const toggleableCount = computed(() =>
  results.value.filter(r => r.type !== 'base').length
)

/** 本地假数据：构造“疑 + 多个密 + 每个密挂两个次” */
function buildMockContactGraph(baseId) {
  // 0 层：主疑
  const base = {
    id: baseId,
    type: 'base',
    level: 0,
    parentId: null,
    visualize: true,  // 主疑永远显示
    expanded: true,
    locations: [
      { lng: 117.0005, lat: 36.6752, time: '2025-11-06T08:00:00+08:00' },
      { lng: 117.0123, lat: 36.6801, time: '2025-11-06T08:30:00+08:00' },
      { lng: 117.0288, lat: 36.6889, time: '2025-11-06T09:10:00+08:00' }
    ]
  }

  // 1 层：密接（A/B/C）
  const closeRaw = [
    {
      id: `${baseId}-A`,
      locations: [
        { lng: 117.0100, lat: 36.6790, time: '2025-11-06T08:25:00+08:00' },
        { lng: 117.0120, lat: 36.6800, time: '2025-11-06T08:32:00+08:00' }
      ]
    },
    {
      id: `${baseId}-B`,
      locations: [
        { lng: 117.0250, lat: 36.6870, time: '2025-11-06T09:05:00+08:00' },
        { lng: 117.0285, lat: 36.6890, time: '2025-11-06T09:12:00+08:00' }
      ]
    },
    {
      id: `${baseId}-C`,
      locations: [
        { lng: 117.0040, lat: 36.6765, time: '2025-11-06T08:05:00+08:00' },
        { lng: 117.0065, lat: 36.6778, time: '2025-11-06T08:12:00+08:00' }
      ]
    }
  ]

  const closeContacts = closeRaw.map(c => ({
    ...c,
    type: 'close',
    level: 1,
    parentId: baseId,
    visualize: false,  // 密接默认隐藏
    expanded: false    // 默认收起次密接
  }))

  // 2 层：次密接（每个密接挂两条）
  const secondaries = closeContacts.flatMap(close => {
    const last = close.locations[close.locations.length - 1]
    const baseLng = last.lng
    const baseLat = last.lat

    const rawSecs = [
      { id: `${close.id}-1`, offsetLng: 0.002,   offsetLat: 0.001 },
      { id: `${close.id}-2`, offsetLng: -0.0015, offsetLat: 0.0012 }
    ]

    return rawSecs.map(s => ({
      id: s.id,
      type: 'secondary',
      level: 2,
      parentId: close.id,
      visualize: false,  // 默认隐藏
      expanded: false,
      locations: [
        {
          lng: baseLng + s.offsetLng,
          lat: baseLat + s.offsetLat,
          time: '2025-11-06T09:20:00+08:00'
        },
        {
          lng: baseLng + s.offsetLng * 1.3,
          lat: baseLat + s.offsetLat * 1.1,
          time: '2025-11-06T09:30:00+08:00'
        }
      ]
    }))
  })

  return [base, ...closeContacts, ...secondaries]
}

/** 搜索：构造本地“疑-密-次”图；空搜索清空结果并通知地图清除 */
const handleSearch = async () => {
  const kw = personId.value.trim()

  if (!kw) {
    results.value = []
    selectAll.value = false
    emit('clear-map')
    return
  }

  loading.value = true
  try {
    const items = buildMockContactGraph(kw)
    results.value = items
    selectAll.value = false

    // ★ 调用测试绘制函数
    drawMultiplePolylines()

    // 预留：一次性把图结构抛给上层/地图
    emit('draw-batch', { baseId: kw, items })
    emit('search', kw)
  } finally {
    loading.value = false
  }
}

/** 点击整张事件框：切换显隐（主疑不参与） */
const onCardClick = (item) => {
  if (item.type === 'base') return

  item.visualize = !item.visualize
  syncSelectAllState()

  emit('set-visualize', {
    id: item.id,
    visualize: item.visualize
  })
}

/** 同步全选勾选状态：所有非 base 显示时，全选为 true */
const syncSelectAllState = () => {
  const list = results.value.filter((r) => r.type === 'close')
  selectAll.value =
    list.length > 0 && list.every((r) => r.visualize)
}

/** 展开/收起：密接 → 次密接 */
const toggleExpand = (item) => {
  if (item.type !== 'close') return
  item.expanded = !item.expanded
}

/** 顶部全选：仅作用于非 base 条目（密接 + 次密接） */
const toggleSelectAll = (event) => {
  const next = event.target.checked        // 这次点击之后应该变成的状态
  selectAll.value = next                   // 直接同步到 selectAll

  const changed = []

  // 只控制“密接”，不控制“次密接”和“主疑”
  results.value.forEach((r) => {
    if (r.type === 'close') {
      r.visualize = next
      changed.push({ id: r.id, visualize: r.visualize })
    }
  })

  // 不再在这里调用 syncSelectAllState，避免把手动选择覆盖掉
  emit('set-visualize-batch', changed)
}


</script>

<style scoped>
/* 整体布局：左地图 + 右搜索栏 */
.contact-tracing-container {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  width: 100%;
  height: 100vh;
  background-color: #f5f7fa;
}

.map-container {
  flex: 1;
  min-width: 0;
}

/* 右侧搜索面板：用 grid 划出“唯一滚动区” */
.contact-panel {
  width: 320px;
  min-width: 280px;
  background: #fff;
  border-left: 1px solid #e8e8e8;

  display: grid;
  grid-template-rows: auto auto 1px minmax(0, 1fr) auto;
}

/* 顶部搜索栏 */
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

/* 全选行 */
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

/* 分隔黑线 */
.divider {
  height: 1px;
  background: #000;
  margin: 0 10px;
}

/* 结果列表：唯一滚动区域 */
.results {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 10px 10px;
  scrollbar-gutter: stable;
}

/* 滚动条样式：只有内容超出时才出现 */
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

/* 事件卡片 */
.result-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: #fafafa;
  border: 1px solid #efefef;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
}
.result-card:hover {
  background: #f6f9ff;
}
.result-card.active {
  box-shadow: 0 0 0 1px rgba(22, 119, 255, 0.5);
}
.result-card.hidden {
  opacity: 0.55;
}

/* 左侧彩色边条：按类型区分 */
.result-card.base {
  border-left: 3px solid #f5222d; /* 红：主疑 */
}
.result-card.close {
  border-left: 3px solid #fadb14; /* 黄：密接 */
}
.result-card.secondary {
  border-left: 3px solid #1677ff; /* 蓝：次密接 */
}

/* ID显示部分 */
.result-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.id-text {
  font-weight: 600;
  color: #222;
}

/* 徽标：公共外形 + 三种颜色 */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 12px;
  user-select: none;
}
.badge-base {
  background: #f5222d;
  color: #fff;
}
.badge-close {
  background: #fadb14;
  color: #000;
}
.badge-secondary {
  background: #1677ff;
  color: #fff;
}

/* 展开按钮：仅密接有 */
.expand-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  padding: 2px 4px;
}
.expand-btn:hover {
  color: #1677ff;
}

/* 底部加载状态 */
.state {
  padding: 10px;
  text-align: center;
  color: #666;
  font-size: 14px;
  border-top: 1px solid #f0f0f0;
}
</style>
