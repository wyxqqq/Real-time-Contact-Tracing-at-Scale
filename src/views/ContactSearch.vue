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

      <!-- 顶部全选（只控制密接卡片 + 密接区域路径） -->
      <div class="select-all-row">
        <label class="select-all">
          <input
            type="checkbox"
            v-model="selectAll"
            @change="toggleSelectAll"
          />
          <span>全选密接</span>
        </label>
        <span class="select-all-hint" v-if="toggleableCount > 0">
          共 {{ toggleableCount }} 个密接
        </span>
      </div>

      <!-- 分隔线 -->
      <div class="divider"></div>

      <!-- 结果列表（可滚动区域） -->
      <div class="results">
        <!-- 空状态 -->
        <div
          v-if="!loading && visibleResults.length === 0"
          class="empty"
        >
          暂无结果，请输入 ID 后搜索
        </div>

        <!-- 事件卡（疑 / 密 / 次） -->
        <div
          v-for="item in visibleResults"
          :key="item.id + '-' + item.type + '-' + item.parentId"
          class="result-card"
          :data-type="item.type"
          :class="[item.type, { hidden: !item.visualize, active: item.visualize, 'hover-card': item.id === hoveredRegionId }]"
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
 *   parentId: string | null,
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

/**
 * polyline 样式
 * 采用极高 zIndex + 加粗方案，确保路线压住底图道路
 */
const STYLE_BASE_FULL = {
  strokeColor: '#e74645',
  strokeWeight: 12,
  strokeOpacity: 0.9,
  isOutline: true,
  outlineColor: '#000000',
  outlineWeight: 6,
  showDir: true,
  lineCap: 'round',
  lineJoin: 'round',
  zIndex: 999990
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

// 当前悬停的区域对应的条目 ID（密接或次密接）
const hoveredRegionId = ref(null)

// 正在闪烁的密接完整路径：key = 密接ID → { timerId, originalExpanded }
const closeBlinkTimers = new Map()

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

  // 停止所有闪烁定时器并重置悬停状态
  closeBlinkTimers.forEach(({ timerId }) => clearInterval(timerId))
  closeBlinkTimers.clear()
  hoveredRegionId.value = null
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

  const data = json.data
  const id1 = data.id1 ?? baseId
  const baseIdStr = String(id1)

  const items = []

  // 疑似病例
  items.push({
    id: baseIdStr,
    type: 'base',
    parentId: null,
    visualize: true,
    expanded: true,
    locations: []
  })

  const contacts = Array.isArray(data.contacts) ? data.contacts : []

  // 收集所有密接 id2，用于过滤“次密接里重复出现的密接”
  const closeIdSet = new Set(
    contacts.map((c) => String(c.id2))
  )

  contacts.forEach((c) => {
    const closeIdStr = String(c.id2)

    items.push({
      id: closeIdStr,
      type: 'close',
      parentId: baseIdStr,
      visualize: false,
      expanded: false,
      locations: [],
      contactStart: c.start_time,
      contactEnd: c.end_time
    })

    const secArr = Array.isArray(c.id3_contacts)
      ? c.id3_contacts
      : []

    secArr.forEach((sec) => {
      const secIdStr = String(sec.id3)

      // 如果这个人已经是密接，就不再作为次密接挂在其他人下面
      if (closeIdSet.has(secIdStr)) {
        return
      }

      items.push({
        id: secIdStr,
        type: 'secondary',
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
 * 一次性绘制所有路线：
 * - 疑似完整路径（红）
 * - 密接完整路径（紫）
 * - 疑似-密接区域路径（黄）
 * - 密接-次密接区域路径（青）
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

  // 密接完整路径：紫色，默认按 expanded 显示/隐藏
  const closes = all.filter((r) => r.type === 'close')
  closes.forEach((close) => {
    if (close.locations && close.locations.length >= 2) {
      const path = toPath(close.locations)
      const poly = mapComponent.value.addPolyline(path, STYLE_CLOSE_FULL)
      if (poly) {
        closeFullPolylines.set(close.id, poly)
        if (close.expanded) {
          poly.show()
        } else {
          poly.hide()
        }
      }
    }
  })

  // 疑似-密接：区域路径（黄）在“疑似轨迹”上截子段
  if (base && base.locations && base.locations.length >= 2) {
    closes.forEach((close) => {
      if (
        close.contactStart &&
        close.contactEnd &&
        typeof close.contactStart !== 'undefined' &&
        typeof close.contactEnd !== 'undefined'
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
            {
              ...STYLE_REGION_BASE_CLOSE,
              extData: {
                regionType: 'base-close',
                id: close.id,
                baseId: base.id
              }
            }
          )
          if (regionPoly) {
            regionPoly.hide()
            regionBaseClosePolylines.set(close.id, regionPoly)
          }
        }
      }
    })
  }

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
      {
        ...STYLE_REGION_CLOSE_SECONDARY,
        extData: {
          regionType: 'close-secondary',
          id: sec.id,
          closeId: parentClose.id
        }
      }
    )
    if (poly) {
      poly.hide()
      regionCloseSecondaryPolylines.set(sec.id, poly)
    }
  })
}

/**
 * 悬停效果：区域路径 + 右侧卡片 + 密接完整路径闪烁
 */

/** 根据区域类型设置 hover 样式 */
function setRegionHoverStyle(polyline, regionType, isHover) {
  if (!polyline) return

  const baseStyle =
    regionType === 'base-close'
      ? STYLE_REGION_BASE_CLOSE
      : STYLE_REGION_CLOSE_SECONDARY

  if (!isHover) {
    polyline.setOptions(baseStyle)
    return
  }

  const hoverStyle = {
    ...baseStyle,
    strokeWeight: baseStyle.strokeWeight + 3,
    strokeOpacity: Math.min(1, baseStyle.strokeOpacity * 2)
  }
  polyline.setOptions(hoverStyle)
}

/**
 * 地图发来的“区域路径悬停进入”事件
 * payload 结构由 AMapComponent.extData 决定：
 * { regionType: 'base-close' | 'close-secondary', id: string, baseId?: string, closeId?: string }
 */
function handleRegionHoverIn(payload) {
  const { regionType, id, closeId } = payload || {}
  if (!regionType || !id) return

  // 高亮右侧对应卡片
  hoveredRegionId.value = id

  // 找到对应区域 polyline
  let regionPolyline = null
  if (regionType === 'base-close') {
    regionPolyline = regionBaseClosePolylines.get(id)
  } else if (regionType === 'close-secondary') {
    regionPolyline = regionCloseSecondaryPolylines.get(id)
  }
  setRegionHoverStyle(regionPolyline, regionType, true)

  // 闪烁逻辑：只对密接完整路径生效
  const closeIdForFull = regionType === 'base-close' ? id : closeId
  if (!closeIdForFull) return

  const closeItem = results.value.find(
    (r) => r.type === 'close' && r.id === closeIdForFull
  )
  const fullPolyline = closeFullPolylines.get(closeIdForFull)

  if (!closeItem || !fullPolyline) return

  // 如果密接完整路径当前是“显示”（expanded = true），则不闪烁
  if (closeItem.expanded) return

  // 已经在闪烁中，不重复开启
  if (closeBlinkTimers.has(closeIdForFull)) return

  const originalExpanded = closeItem.expanded

  // 先显示一次，再开始闪烁
  fullPolyline.show()

  const timerId = setInterval(() => {
    if (fullPolyline.getMap()) {
      fullPolyline.hide()
    } else {
      fullPolyline.show()
    }
  }, 1000)

  closeBlinkTimers.set(closeIdForFull, {
    timerId,
    originalExpanded
  })
}

/** 地图发来的“区域路径悬停离开”事件 */
function handleRegionHoverOut(payload) {
  const { regionType, id, closeId } = payload || {}
  if (!regionType || !id) return

  // 取消右侧卡片高亮
  if (hoveredRegionId.value === id) {
    hoveredRegionId.value = null
  }

  // 恢复区域线样式
  let regionPolyline = null
  if (regionType === 'base-close') {
    regionPolyline = regionBaseClosePolylines.get(id)
  } else if (regionType === 'close-secondary') {
    regionPolyline = regionCloseSecondaryPolylines.get(id)
  }
  setRegionHoverStyle(regionPolyline, regionType, false)

  // 停止密接完整路径闪烁，恢复原始状态
  const closeIdForFull = regionType === 'base-close' ? id : closeId
  if (!closeIdForFull) return

  const info = closeBlinkTimers.get(closeIdForFull)
  const fullPolyline = closeFullPolylines.get(closeIdForFull)

  if (info) {
    clearInterval(info.timerId)
    closeBlinkTimers.delete(closeIdForFull)

    if (fullPolyline) {
      if (info.originalExpanded) {
        fullPolyline.show()
      } else {
        fullPolyline.hide()
      }
    }
  }
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

    if (close.expanded) {
      const children = all.filter(
        (sec) => sec.type === 'secondary' && sec.parentId === close.id
      )
      ordered.push(...children)
    }
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

/** 可被全选控制的密接数量 */
const toggleableCount = computed(() => {
  return results.value.filter((item) => item.type === 'close').length
})

/**
 * 输入并搜索：
 * - 空输入：清空结果 + 清空地图
 * - 非法输入：提示
 * - 合法 ID：调用接口，填充 results + 绘制路线
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
    Number.isFinite(idNum) &&      // 有限数
    idNum >= 0 && idNum <= 99999   // 范围 0~99999

  if (!isIntId) {
    alert('ID 必须为 0~99999 的整数，请检查输入')
    return
  }

  loading.value = true
  try {
    // 1）根据 id 查询“疑-密-次”关系
    const items = await fetchContactGraphFromApi(kw)

    if (!items || items.length === 0) {
      results.value = []
      clearAllPolylines()
      emit('clear-map')
      return
    }

    // 2）查询每个人的完整轨迹
    const base = items.find((r) => r.type === 'base')
    const closes = items.filter((r) => r.type === 'close')

    if (base) {
      base.locations = await fetchTraceFromApi(base.id)
    }

    await Promise.all(
      closes.map(async (c) => {
        c.locations = await fetchTraceFromApi(c.id)
      })
    )

    // 初始化可视状态：
    // - 疑似：可视 + 展开
    // - 密接、次密接：默认不可视 + 不展开
    items.forEach((it) => {
      if (it.type === 'base') {
        it.visualize = true
        it.expanded = true
      } else {
        it.visualize = false
        it.expanded = false
      }
    })

    results.value = items

    // 同步全选状态（密接是否全部可视）
    const closeList = results.value.filter((r) => r.type === 'close')
    selectAll.value =
      closeList.length > 0 &&
      closeList.every((r) => r.visualize)

    // 绘制所有路线
    initPolylinesForCurrentData()

    // 通知外部（如果有需要）
    emit('search', { id: kw, results: results.value })
  } catch (err) {
    console.error(err)
    alert(err.message || '查询失败，请稍后重试')
    results.value = []
    clearAllPolylines()
    emit('clear-map')
  } finally {
    loading.value = false
  }
}

/**
 * 点击卡片：
 * - base：不做任何事情
 * - close：切换“疑似-密接区域路径（黄）”显隐
 * - secondary：切换“密接-次密接区域路径（青）”显隐
 */
const onCardClick = (item) => {
  if (item.type === 'base') return

  const wasVisible = item.visualize
  item.visualize = !item.visualize

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
 * 密接卡片右侧“展开/收起”按钮：
 * - 只控制密接完整路径（紫色）显隐
 * - 次密接区域不受影响
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

  const list = results.value.filter((r) => r.type === 'close')
  list.forEach((item) => {
    const wasVisible = item.visualize
    item.visualize = next

    const region = regionBaseClosePolylines.get(item.id)
    if (region) {
      if (!wasVisible && next) {
        region.show()
      } else if (wasVisible && !next) {
        region.hide()
      }
    }
  })
}
</script>

<style scoped>
/* 整体布局：左右分栏 */
.contact-tracing-container {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  background-color: #f5f7fa;
}

/* 左侧地图区域 */
.map-container {
  flex: 1 1 70%;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  /* margin-right: 12px; */
}

/* 右侧搜索 / 列表面板 */
.contact-panel {
  flex: 0 0 360px;
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* 顶部搜索工具栏 */
.toolbar {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
}

/* 搜索框 */
.search-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  outline: none;
  font-size: 14px;
}

.search-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 1px rgba(22, 119, 255, 0.2);
}

/* 普通按钮 */
.btn {
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn.primary {
  background: #1677ff;
  color: #fff;
}

/* 顶部全选行 */
.select-all-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.select-all input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.select-all-hint {
  color: #999;
}

/* 中间黑色分隔线 */
.divider {
  height: 1px;
  background: #000;
  margin: 0 10px;
}

/* 结果列表区域（可滚） */
.results {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 10px 10px;
  scrollbar-gutter: stable;
}

/* 自定义滚动条 */
.results::-webkit-scrollbar {
  width: 8px;
}
.results::-webkit-scrollbar-track {
  background: transparent;
}
.results::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.12);
}

/* 空状态提示 */
.empty {
  padding: 18px 0;
  color: #999;
  text-align: center;
  font-size: 14px;
}

/* 单个事件卡片 */
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
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
  cursor: pointer;
}

.result-card:hover {
  background: #f6f9ff;
}

/* 隐藏态（区域未显示） */
.result-card.hidden {
  opacity: 0.55;
}

/* 右侧悬停联动时的卡片高亮 */
.result-card.hover-card {
  background: #e6f4ff;
  border-color: #1677ff;
  box-shadow: 0 0 0 1px rgba(22, 119, 255, 0.4);
}

/* 左侧主体部分 */
.result-main {
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: #1ac0c6;
  color: #fff;
}

/* ID 文本 */
.id-text {
  font-weight: 500;
  color: #333;
}

/* 展开按钮（密接） */
.expand-btn {
  border: none;
  background: transparent;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
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
