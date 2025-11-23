<template>
  <div class="contact-tracing-container">
    <!-- 左侧地图 -->
  <div class="map-container">
    <AMapComponent
      ref="mapComponent"
      @region-hover-in="handleRegionHoverIn"
      @region-hover-out="handleRegionHoverOut"
    />
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

      <!-- 顶部：全选（只控制“密接”的可视化/区域线） -->
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

      <!-- 结果区（唯一滚动区域） -->
      <div class="results">
        <!-- 空状态 -->
        <div class="empty" v-if="!loading && visibleResults.length === 0">
          暂无结果，请输入 ID 后搜索
        </div>

        <!-- 事件卡（疑 / 密 / 次） -->
        <div
          v-for="item in visibleResults"
          :key="item.id + '-' + item.type + '-' + item.parentId"
          class="result-card"
          :data-type="item.type"
          :class="[item.type, { hidden: !item.visualize, active: item.visualize }]"
          @click="onCardClick(item)"
        >
          <!-- 左侧主体：疑/密不缩进，次密接缩进 -->
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

            <span class="id-text">
              ID：{{ item.id }}
            </span>
          </div>

          <!-- 右侧展开键：仅密接有，控制密接“完整路径”的显示/隐藏 -->
          <button
            v-if="item.type === 'close'"
            class="expand-btn"
            @click.stop="toggleExpand(item)"
          >
            {{ item.expanded ? '收起' : '展开' }}
          </button>
        </div>
      </div>

      <!-- 底部状态 -->
      <div class="state" v-if="loading">正在加载…</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AMapComponent from '../components/AMapComponent.vue'

/** 地图组件实例引用 */
const mapComponent = ref(null)

/** 搜索输入：ID */
const personId = ref('')

/** 顶部“全选”状态（只控制密接卡片 + 密接区域路径） */
const selectAll = ref(false)

/**
 * 搜索结果列表（完整“疑-密-次”结构）
 * 每条结构：
 * {
 *   id: string,
 *   type: 'base' | 'close' | 'secondary',
 *   level: 0|1|2,
 *   parentId: string|null,
 *   visualize: boolean,
 *   expanded: boolean,
 *   locations: Array<{time: string, lng: number, lat: number}>,
 *   contactStart?: string,
 *   contactEnd?: string
 * }
 */
const results = ref([])

/** 加载态 */
const loading = ref(false)

/** 对外事件（保留接口） */
const emit = defineEmits([
  'draw-batch',
  'set-visualize',
  'set-visualize-batch',
  'clear-map',
  'search'
])

/** 后端基础地址 */
const API_BASE = 'http://39.96.159.110:8080'

/** ============================
 *   路径样式（按你最终方案）
 * ============================ */

const STYLE_BASE_FULL = {
  strokeColor: '#e74645',
  strokeWeight: 12,
  strokeOpacity: 0.9,
  isOutline: true,
  outlineColor: '#000000',
  outlineWeight: 6,      // ⭐ 加粗黑边
  showDir: true,
  lineCap: 'round',
  lineJoin: 'round',
  zIndex: 999990         // ⭐ 极限提升
}

const STYLE_CLOSE_FULL = {
  strokeColor: '#e645be',
  strokeWeight: 10,
  strokeOpacity: 0.7,
  isOutline: true,
  outlineColor: '#000000',
  outlineWeight: 5,
  showDir: true,
  lineCap: 'round',
  lineJoin: 'round',
  zIndex: 999991
}

const STYLE_REGION_BASE_CLOSE = {
  strokeColor: '#ffff00',
  strokeWeight: 15,
  strokeOpacity: 0.45,
  isOutline: true,
  outlineColor: '#000000',
  outlineWeight: 7,
  showDir: false,
  lineCap: 'round',
  lineJoin: 'round',
  zIndex: 999992
}

const STYLE_REGION_CLOSE_SECONDARY = {
  strokeColor: '#1ac0c6',
  strokeWeight: 15,
  strokeOpacity: 0.45,
  isOutline: true,
  outlineColor: '#000000',
  outlineWeight: 7,
  showDir: false,
  lineCap: 'round',
  lineJoin: 'round',
  zIndex: 999993
}


/** polyline 引用（用于 show/hide） */
const baseFullPolyline = ref(null)              // 疑似完整路径
const closeFullPolylines = new Map()            // key: 密接ID → polyline
const regionBaseClosePolylines = new Map()      // key: 密接ID → polyline（疑似-密接区域）
const regionCloseSecondaryPolylines = new Map() // key: 次密接ID → polyline（密接-次密接区域）

/** 工具：清空所有已绘制的折线 */
function clearAllPolylines() {
  if (baseFullPolyline.value) {
    baseFullPolyline.value.setMap(null)
    baseFullPolyline.value = null
  }
  for (const poly of closeFullPolylines.values()) {
    poly.setMap(null)
  }
  closeFullPolylines.clear()

  for (const poly of regionBaseClosePolylines.values()) {
    poly.setMap(null)
  }
  regionBaseClosePolylines.clear()

  for (const poly of regionCloseSecondaryPolylines.values()) {
    poly.setMap(null)
  }
  regionCloseSecondaryPolylines.clear()
}

/** 工具：{lng,lat}[] with time → [[lng,lat], ...] */
function toPath(locations = []) {
  return locations.map((p) => [p.lng, p.lat])
}

/** 把 time / start_time / end_time 转成 0-600 的数字（或 NaN） */
function toNumTime(t) {
  if (t === null || t === undefined) return NaN
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

/**
 * 区域路径切片（严格按时间段，不扩展）：
 * 区域路径 = trace 中所有 time ∈ [start, end] 的点
 */
/**
 * 在统一时间轴 0–600 上，按 [start, end] 直接裁剪轨迹
 * 
 * trace: [{ time: number|string, lng, lat }, ...]  // time 在 0–600 上
 * startTime, endTime: 后端给的 start_time / end_time（0–600）
 *
 * 逻辑：区域路径 = 所有满足 start <= time <= end 的点
 */
function sliceTraceByTime(trace, startTime, endTime) {
  if (!trace || trace.length === 0) return []

  const s = toNumTime(startTime)
  const e = toNumTime(endTime)
  if (!Number.isFinite(s) || !Number.isFinite(e)) {
    return []
  }

  const [lo, hi] = s <= e ? [s, e] : [e, s]

  const sliced = trace.filter((pt) => {
    const t = toNumTime(pt.time)
    return Number.isFinite(t) && t >= lo && t <= hi
  })

  // 不足 2 个点，高德没法画折线
  if (sliced.length < 2) return []

  return sliced
}


/**
 * /api/tracing/:id1 → “疑 / 密 / 次”关系结构
 * 这里只负责关系和时间段，不填轨迹
 */
/**
 * 调用 /api/tracing/:id1，转换为“疑/密/次”结构
 * 同时保证：对于同一个疑似 id1，
 *   所有密接 id2 不能再作为任何 id3（次密接）出现
 */
async function fetchContactGraphFromApi(baseId) {
  const url = `${API_BASE}/api/tracing/${encodeURIComponent(baseId)}`
  const resp = await fetch(url)

  if (!resp.ok) {
    throw new Error(`网络错误：HTTP ${resp.status}`)
  }

  const json = await resp.json()

  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '查询失败')
  }

  const { id1, contacts } = json.data
  const baseIdStr = String(id1 ?? baseId)

  const items = []

  // 0 层：主疑（疑似病例）
  items.push({
    id: baseIdStr,
    type: 'base',
    level: 0,
    parentId: null,
    visualize: true,
    expanded: true,
    locations: []
  })

  const contactArr = contacts || []

  // ⭐ 收集所有密接 id2，用于后面过滤“次密接里重复出现的密接”
  const closeIdSet = new Set(
    contactArr.map((c) => String(c.id2))
  )

  // 1 层：密接（id2） + 2 层：次密接（id3）
  contactArr.forEach((c) => {
    const closeIdStr = String(c.id2)

    // 密接
    items.push({
      id: closeIdStr,
      type: 'close',
      level: 1,
      parentId: baseIdStr,
      visualize: false,
      expanded: false,
      locations: [],
      contactStart: c.start_time,
      contactEnd: c.end_time
    })

    // 次密接（过滤掉那些本身就是密接的人）
    ;(c.id3_contacts || []).forEach((sec) => {
      const secIdStr = String(sec.id3)

      // ⭐ 对于同一个疑似：如果某个 id3 已经是某个 id2，就不再作为次密接加入
      if (closeIdSet.has(secIdStr)) {
        return
      }

      items.push({
        id: secIdStr,
        type: 'secondary',
        level: 2,
        parentId: closeIdStr,
        visualize: false,
        expanded: false,
        locations: [],
        contactStart: sec.start_time,
        contactEnd: sec.end_time
      })
    })
  })

  return items
}


/** /api/trace/:id → 带时间的完整轨迹 */
async function fetchTraceFromApi(id) {
  const url = `${API_BASE}/api/trace/${encodeURIComponent(id)}`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`轨迹网络错误：HTTP ${resp.status}`)
  }
  const json = await resp.json()
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || '轨迹查询失败')
  }
  const trace = (json.data.trace || []).map((p) => ({
    time: p.time,
    lng: p.location[0],
    lat: p.location[1]
  }))
  return trace
}

/**
 * 根据当前 results 一次性绘制所有路线：
 * - 疑似完整路径（红）
 * - 密接完整路径（紫）
 * - 疑似-密接区域路径（黄）：在“疑似轨迹”上按时间段截子段
 * - 密接-次密接区域路径（青）：在“密接轨迹”上按时间段截子段
 */
function initPolylinesForCurrentData() {
  if (!mapComponent.value) return

  clearAllPolylines()

  const all = results.value

  // 疑似完整路径
  const base = all.find((r) => r.type === 'base')
  if (base && base.locations && base.locations.length >= 2) {
    const path = toPath(base.locations)
    const poly = mapComponent.value.addPolyline(path, STYLE_BASE_FULL)
    if (poly) {
      baseFullPolyline.value = poly
      poly.show()
    }
  }

  const closes = all.filter((r) => r.type === 'close')

  // 密接：完整路径 + 疑似-密接区域
  closes.forEach((close) => {
    if (!close.locations || close.locations.length < 2) return

    // 密接完整路径（紫）
    const closePath = toPath(close.locations)
    const full = mapComponent.value.addPolyline(closePath, STYLE_CLOSE_FULL)
    if (full) {
      full.hide() // 默认隐藏，展开密接时 show
      closeFullPolylines.set(close.id, full)
    }

    // 疑似-密接区域路径：在“疑似轨迹”上按该时间段截子段
    if (
      base &&
      base.locations &&
      base.locations.length >= 2 &&
      close.contactStart &&
      close.contactEnd
    ) {
      const regionPoints = sliceTraceByTime(
        base.locations,
        close.contactStart,
        close.contactEnd
      )
      if (regionPoints.length >= 2) {
        const regionPath = toPath(regionPoints)
        const regionPoly = mapComponent.value.addPolyline(
          regionPath,
          STYLE_REGION_BASE_CLOSE
        )
        if (regionPoly) {
          regionPoly.hide()
          regionBaseClosePolylines.set(close.id, regionPoly)
        }
      }
    }
  })

  // 次密接：密接-次密接区域路径（在“密接轨迹”上截子段）
  const seconds = all.filter((r) => r.type === 'secondary')
  seconds.forEach((sec) => {
    if (!sec.contactStart || !sec.contactEnd) return

    const parentClose = closes.find((c) => c.id === sec.parentId)
    if (!parentClose || !parentClose.locations || parentClose.locations.length < 2) return

    const regionPoints = sliceTraceByTime(
      parentClose.locations,
      sec.contactStart,
      sec.contactEnd
    )
    if (regionPoints.length < 2) return

    const regionPath = toPath(regionPoints)
    const poly = mapComponent.value.addPolyline(
      regionPath,
      STYLE_REGION_CLOSE_SECONDARY
    )
    if (poly) {
      poly.hide()
      regionCloseSecondaryPolylines.set(sec.id, poly)
    }
  })
}

/**
 * 排序后的结果展示：
 * 主疑 → 按顺序的密接 → 它展开时的次密接
 */
const visibleResults = computed(() => {
  const all = results.value
  const ordered = []

  const base = all.find((item) => item.type === 'base')
  if (base) ordered.push(base)

  const closeList = all.filter((item) => item.type === 'close')
  closeList.forEach((close) => {
    ordered.push(close)

    if (!close.expanded) return

    const children = all.filter(
      (sec) => sec.type === 'secondary' && sec.parentId === close.id
    )
    ordered.push(...children)
  })

  if (!base) {
    const others = all.filter(
      (item) => item.type !== 'close' && item.type !== 'secondary'
    )
    others.forEach((item) => {
      if (!ordered.includes(item)) {
        ordered.unshift(item)
      }
    })
  }

  return ordered
})

/** 被“全选”控制的密接数量 */
const toggleableCount = computed(() =>
  results.value.filter((r) => r.type === 'close').length
)

/**
 * 搜索逻辑：
 * - 空：清空结果 + 清空地图
 * - 非空：
 *   1）/api/tracing 拿疑/密/次关系 + 时间段
 *   2）/api/trace 拿疑似完整轨迹
 *   3）/api/trace 拿所有密接完整轨迹
 *   4）一次性绘制完整路径 + 区域路径（时间切片）
 */
const handleSearch = async () => {
  const kw = personId.value.trim()

  if (!kw) {
    results.value = []
    selectAll.value = false
    clearAllPolylines()
    emit('clear-map')
    return
  }
  const idNum = Number(kw)
  const isIntId =
    /^\d+$/.test(kw) &&            // 全是数字
    Number.isFinite(idNum) &&
    idNum >= 0 &&
    idNum <= 99999

  if (!isIntId) {
    alert('ID 必须为 0~99999 的整数，请检查输入。')
    return
  }

  loading.value = true
  try {
    // 1. 基础关系：疑 / 密 / 次
    const items = await fetchContactGraphFromApi(kw)

    // 2. 疑似完整轨迹
    const baseItem = items.find((r) => r.type === 'base')
    if (baseItem) {
      try {
        const trace = await fetchTraceFromApi(baseItem.id)
        baseItem.locations = trace
      } catch (e) {
        console.error('获取疑似病例轨迹失败', e)
      }
    }

    // 3. 所有密接完整轨迹
    const closeItems = items.filter((r) => r.type === 'close')
    await Promise.all(
      closeItems.map(async (c) => {
        try {
          const trace = await fetchTraceFromApi(c.id)
          c.locations = trace
        } catch (e) {
          console.error(`获取密接 ${c.id} 轨迹失败`, e)
        }
      })
    )

    // 4. 更新状态 & 绘制
    results.value = items
    selectAll.value = false

    initPolylinesForCurrentData()

    emit('draw-batch', { baseId: items[0]?.id ?? kw, items })
    emit('search', kw)
  } catch (err) {
    console.error(err)
    alert(err.message || '查询失败，请稍后重试')
    results.value = []
    selectAll.value = false
    clearAllPolylines()
  } finally {
    loading.value = false
  }
}

/**
 * 点击事件卡：
 * - 密接：切换“疑似-该密接 区域路径（黄）”
 * - 次密接：切换“密接-该次密接 区域路径（青）”
 * - 主疑：不控制路径显隐
 */
const onCardClick = (item) => {
  if (item.type === 'base') return

  const wasVisible = item.visualize
  item.visualize = !item.visualize
  syncSelectAllState()

  emit('set-visualize', {
    id: item.id,
    visualize: item.visualize
  })

  if (item.type === 'close') {
    const region = regionBaseClosePolylines.get(item.id)
    if (region) {
      if (!wasVisible && item.visualize) {
        region.show()
      } else if (wasVisible && !item.visualize) {
        region.hide()
      }
    }
  } else if (item.type === 'secondary') {
    const region = regionCloseSecondaryPolylines.get(item.id)
    if (region) {
      if (!wasVisible && item.visualize) {
        region.show()
      } else if (wasVisible && !item.visualize) {
        region.hide()
      }
    }
  }
}

/** 同步全选状态：只有所有密接都可视时，全选才勾上 */
const syncSelectAllState = () => {
  const list = results.value.filter((r) => r.type === 'close')
  selectAll.value =
    list.length > 0 && list.every((r) => r.visualize)
}

/**
 * 展开/收起密接的次密接列表：
 * 同时控制“该密接完整路径（紫）”显隐
 */
const toggleExpand = (item) => {
  if (item.type !== 'close') return
  const wasExpanded = item.expanded
  item.expanded = !item.expanded

  const poly = closeFullPolylines.get(item.id)
  if (poly) {
    if (!wasExpanded && item.expanded) {
      poly.show()
    } else if (wasExpanded && !item.expanded) {
      poly.hide()
    }
  }
}

/**
 * 顶部“全选”：
 * - 只控制密接卡片 visualize
 * - 同时控制所有“疑似-密接 区域路径（黄）”显隐
 */
const toggleSelectAll = (event) => {
  const next = event.target.checked
  selectAll.value = next

  const changed = []

  results.value.forEach((r) => {
    if (r.type === 'close') {
      const wasVisible = r.visualize
      r.visualize = next
      changed.push({ id: r.id, visualize: r.visualize })

      const region = regionBaseClosePolylines.get(r.id)
      if (region) {
        if (!wasVisible && next) {
          region.show()
        } else if (wasVisible && !next) {
          region.hide()
        }
      }
    }
  })

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

/* 右侧搜索面板：grid 划出“唯一滚动区” */
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

/* 左侧彩色边条 */
.result-card.base {
  border-left: 3px solid #e74645; /* 疑似：红 */
}
.result-card.close {
  border-left: 3px solid #fadb14; /* 密接：黄边，卡片本身仍用“密”标识 */
}
.result-card.secondary {
  border-left: 3px solid #1677ff; /* 次密接：蓝边 */
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

/* 徽标：疑 / 密 / 次 */
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
  background: #e74645;
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
