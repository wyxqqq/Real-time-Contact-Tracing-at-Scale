<template>
  <div class="contact-tracing-container">
    <!-- 左侧地图 -->
    <div class="map-container">
      <AMapComponent
        ref="mapComponent"
        @region-hover-in="handleRegionHoverIn"
        @region-hover-out="handleRegionHoverOut"
      />

      <!-- 地图悬停信息框 -->
      <div v-if="hoverTooltip.visible" class="map-tooltip">
        <!-- 疑似-密接 区域 -->
        <template v-if="hoverTooltip.kind === 'base-close'">
          <div class="tooltip-row">
            <span class="tooltip-label">疑似ID：</span>
            <span class="tooltip-value">{{ hoverTooltip.baseId }}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">密接ID：</span>
            <span class="tooltip-value">{{ hoverTooltip.closeId }}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">时间段：</span>
            <span class="tooltip-value">
              [{{ hoverTooltip.start }}，{{ hoverTooltip.end }}]
            </span>
          </div>
        </template>

        <!-- 密接-次密接 区域 -->
        <template v-else-if="hoverTooltip.kind === 'close-secondary'">
          <div class="tooltip-row">
            <span class="tooltip-label">密接ID：</span>
            <span class="tooltip-value">{{ hoverTooltip.closeId }}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">次密接ID：</span>
            <span class="tooltip-value">{{ hoverTooltip.secondaryId }}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">时间段：</span>
            <span class="tooltip-value">
              [{{ hoverTooltip.start }}，{{ hoverTooltip.end }}]
            </span>
          </div>
        </template>
      </div>
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

        <!-- 事件卡（疑 / 密 / 次 / 无次密接/无密接 提示） -->
        <div
          v-for="item in visibleResults"
          :key="item.id + '-' + item.type + '-' + (item.parentId || 'root')"
          class="result-card"
          :data-type="item.type"
          :class="[
            item.type,
            {
              hidden: item.type !== 'base' && item.type !== 'no-secondary' && !item.visualize,
              active: item.visualize,
              'hover-card': cardHoverKey(item) === hoveredRegionKey,
              'no-secondary-card': item.type === 'no-secondary'
            }
          ]"
          @click="onCardClick(item)"
        >
          <!-- 左侧主体：疑/密不缩进，次密接 + 无次密接/无密接 提示缩进 -->
          <div
            class="result-main"
            :style="{ paddingLeft: (item.type === 'secondary' || item.type === 'no-secondary') ? '24px' : '8px' }"
          >
            <!-- 无次密接 / 无密接 提示卡片 -->
            <template v-if="item.type === 'no-secondary'">
              <span class="no-secondary-dot"></span>
              <span class="no-secondary-text">
                {{ item.message || '该密接暂无次密接记录' }}
              </span>
            </template>

            <!-- 正常的 疑 / 密 / 次 卡片 -->
            <template v-else>
              <!-- 徽标 -->
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
            </template>
          </div>

          <!-- 右侧展开键：仅密接有，控制密接“完整路径”的显示/隐藏 -->
          <button
            v-if="item.type === 'close'"
            class="expand-btn"
            @click.stop="toggleExpand(item)"
            :aria-label="item.expanded ? '收起次密接' : '展开次密接'"
          >
            <!-- 折叠：向右 60° 锐角箭头 -->
            <svg
              v-if="!item.expanded"
              class="arrow-icon"
              viewBox="0 0 1024 1024"
            >
              <polyline
                points="360,256 640,512 360,768"
                fill="none"
                stroke="currentColor"
                stroke-width="80"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <!-- 展开：向下 60° 锐角箭头 -->
            <svg
              v-else
              class="arrow-icon"
              viewBox="0 0 1024 1024"
            >
              <polyline
                points="256,360 512,640 768,360"
                fill="none"
                stroke="currentColor"
                stroke-width="80"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
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
 */
/** 1. 疑似病例完整路径（深红） */
const STYLE_BASE_FULL = {
  strokeColor: '#ff0000',   // ← 新颜色
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

/** 2. 密接完整路径（紫红） */
const STYLE_CLOSE_FULL = {
  strokeColor: '#b30086',   // ← 新颜色
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

/** 3. 疑似-密接 区域路径（蓝） */
const STYLE_REGION_BASE_CLOSE = {
  strokeColor: '#164beb',   // ← 新颜色
  strokeWeight: 13,
  strokeOpacity: 0.45,
  isOutline: true,
  outlineColor: '#000000',
  outlineWeight: 7,
  showDir: false,
  lineCap: 'round',
  lineJoin: 'round',
  zIndex: 999992
}

/** 4. 密接-次密接 区域路径（绿） */
const STYLE_REGION_CLOSE_SECONDARY = {
  strokeColor: '#00b300',   // ← 新颜色
  strokeWeight: 13,
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
// 二元主键：`${closeId}__${secId}` → polyline（密接-次密接区域）
const regionCloseSecondaryPolylines = new Map()

// 当前悬停的区域对应的“逻辑主键”
// - base-close：'close:<closeId>'
// - close-secondary：'sec:<closeId>__<secId>'
const hoveredRegionKey = ref(null)

/**
 * 悬停信息框内容
 * kind: 'base-close' | 'close-secondary'
 */
const hoverTooltip = ref({
  visible: false,
  kind: null,
  baseId: '',
  closeId: '',
  secondaryId: '',
  start: '',
  end: ''
})

/**
 * 记录“因为悬停而临时显示”的密接完整路径：
 * key: closeId → true
 */
const hoverTempCloseFull = new Map()

/** 工具：清空所有已绘制的折线 */
function clearAllPolylines () {
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

  hoverTempCloseFull.clear()
  hoveredRegionKey.value = null
  hoverTooltip.value = {
    visible: false,
    kind: null,
    baseId: '',
    closeId: '',
    secondaryId: '',
    start: '',
    end: ''
  }
}

/** 工具：{lng,lat}[] with time → [[lng,lat], ...] */
function toPath (locations = []) {
  return locations.map((p) => [p.lng, p.lat])
}

/** 把 time / start_time / end_time 转成 0-600 的数字（或 NaN） */
function toNumTime (t) {
  if (t === null || t === undefined) return NaN
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

/**
 * 在统一时间轴 0–600 上，按 [start, end] 直接裁剪轨迹
 */
function sliceTraceByTime (trace, startTime, endTime) {
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

  if (sliced.length < 2) return []
  return sliced
}

/**
 * 调用 /api/tracing/:id1，转换为“疑 / 密 / 次”结构
 */
async function fetchContactGraphFromApi (baseId) {
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

  // 疑似
  items.push({
    id: baseIdStr,
    type: 'base',
    parentId: null,
    visualize: true,
    expanded: true,
    locations: []
  })

  const contacts = Array.isArray(data.contacts) ? data.contacts : []

  // 1) 为每个密接 id2 选“第一次密接”时间段
  const closeBestMap = new Map()
  const closeOrder = []

  contacts.forEach((c) => {
    const closeIdStr = String(c.id2)
    const startNum = toNumTime(c.start_time)

    if (!closeBestMap.has(closeIdStr)) {
      closeOrder.push(closeIdStr)
      closeBestMap.set(closeIdStr, {
        contactStart: c.start_time,
        contactEnd: c.end_time,
        startNum
      })
    } else {
      const prev = closeBestMap.get(closeIdStr)
      if (
        Number.isFinite(startNum) &&
        (!Number.isFinite(prev.startNum) || startNum < prev.startNum)
      ) {
        closeBestMap.set(closeIdStr, {
          contactStart: c.start_time,
          contactEnd: c.end_time,
          startNum
        })
      }
    }
  })

  const closeIdSet = new Set(closeBestMap.keys())

  // 2) 为每个 (id2, id3) 选“第一次密接”时间段
  const secBestMap = new Map()
  const secOrder = []

  contacts.forEach((c) => {
    const closeIdStr = String(c.id2)
    const secArr = Array.isArray(c.id3_contacts) ? c.id3_contacts : []

    secArr.forEach((sec) => {
      const secIdStr = String(sec.id3)
      const key = `${closeIdStr}__${secIdStr}`
      const startNum = toNumTime(sec.start_time)

      if (!secBestMap.has(key)) {
        secOrder.push(key)
        secBestMap.set(key, {
          closeIdStr,
          secIdStr,
          contactStart: sec.start_time,
          contactEnd: sec.end_time,
          startNum
        })
      } else {
        const prev = secBestMap.get(key)
        if (
          Number.isFinite(startNum) &&
          (!Number.isFinite(prev.startNum) || startNum < prev.startNum)
        ) {
          secBestMap.set(key, {
            closeIdStr,
            secIdStr,
            contactStart: sec.start_time,
            contactEnd: sec.end_time,
            startNum
          })
        }
      }
    })
  })

  // 3) 生成 items

  // 密接
  closeOrder.forEach((closeIdStr) => {
    const info = closeBestMap.get(closeIdStr)
    if (!info) return

    items.push({
      id: closeIdStr,
      type: 'close',
      parentId: baseIdStr,
      visualize: false,
      expanded: false,
      locations: [],
      contactStart: info.contactStart,
      contactEnd: info.contactEnd
    })
  })

  // 次密接
  secOrder.forEach((key) => {
    const info = secBestMap.get(key)
    if (!info) return
    const { closeIdStr, secIdStr, contactStart, contactEnd } = info

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
      contactStart,
      contactEnd
    })
  })

  return items
}

/** /api/trace/:id → 带时间的完整轨迹 */
async function fetchTraceFromApi (id) {
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
 * 绘制所有路线：
 * - 疑似完整（红）
 * - 密接完整（橙）
 * - 疑似-密接区域（黄）
 * - 密接-次密接区域（青）
 */
function initPolylinesForCurrentData () {
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

  // 密接完整路径
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

  // 疑似-密接 区域路径（黄）
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

  // 密接-次密接 区域路径（青）
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
    const key = `${parentClose.id}__${sec.id}`

    const poly = mapComponent.value.addPolyline(
      regionPath,
      {
        ...STYLE_REGION_CLOSE_SECONDARY,
        extData: {
          regionType: 'close-secondary',
          id: sec.id,
          closeId: parentClose.id,
          key
        }
      }
    )
    if (poly) {
      poly.hide()
      regionCloseSecondaryPolylines.set(key, poly)
    }
  })
}

/** 根据区域类型设置 hover 样式（这里只用于 base-close） */
function setRegionHoverStyle (polyline, regionType, isHover) {
  if (!polyline) return
  const baseStyle = STYLE_REGION_BASE_CLOSE

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

/** 卡片的“悬停 key”，用于和 hoveredRegionKey 对比 */
function cardHoverKey (item) {
  if (item.type === 'close') {
    return `close:${item.id}`
  }
  if (item.type === 'secondary') {
    return `sec:${item.parentId}__${item.id}`
  }
  return null
}

/**
 * 地图发来的“区域路径悬停进入”事件
 */
function handleRegionHoverIn (payload) {
  const { regionType, id, closeId, baseId, key } = payload || {}
  if (!regionType || !id) return

  // 右侧卡片高亮 & tooltip 内容
  if (regionType === 'base-close') {
    hoveredRegionKey.value = `close:${id}`
  } else if (regionType === 'close-secondary') {
    const compositeKey = key || `${closeId}__${id}`
    hoveredRegionKey.value = `sec:${compositeKey}`
  }

  const all = results.value
  if (regionType === 'base-close') {
    const baseItem = all.find((r) => r.type === 'base')
    const closeItem = all.find((r) => r.type === 'close' && r.id === id)
    if (baseItem && closeItem) {
      hoverTooltip.value = {
        visible: true,
        kind: 'base-close',
        baseId: baseItem.id,
        closeId: closeItem.id,
        secondaryId: '',
        start: closeItem.contactStart ?? '',
        end: closeItem.contactEnd ?? ''
      }
    }
  } else if (regionType === 'close-secondary') {
    const compositeKey = key || `${closeId}__${id}`
    const secItem = all.find(
      (r) => r.type === 'secondary' && r.id === id && r.parentId === closeId
    )
    if (secItem) {
      hoverTooltip.value = {
        visible: true,
        kind: 'close-secondary',
        baseId: '',
        closeId,
        secondaryId: secItem.id,
        start: secItem.contactStart ?? '',
        end: secItem.contactEnd ?? ''
      }
    }
  }

  // 地图上的操作：
  //  1) base-close：高亮区域 + 对应密接完整路径淡淡显示（如果原本是隐藏状态）
  //  2) close-secondary：不改任何路径，只做 UI 提示
  if (regionType === 'base-close') {
    const regionPolyline = regionBaseClosePolylines.get(id)
    setRegionHoverStyle(regionPolyline, regionType, true)

    const closeIdForFull = id
    const closeItem = results.value.find(
      (r) => r.type === 'close' && r.id === closeIdForFull
    )
    const fullPolyline = closeFullPolylines.get(closeIdForFull)

    if (!closeItem || !fullPolyline) return

    if (!closeItem.expanded) {
      if (!hoverTempCloseFull.has(closeIdForFull)) {
        hoverTempCloseFull.set(closeIdForFull, true)
        fullPolyline.setOptions({
          ...STYLE_CLOSE_FULL,
          strokeOpacity: 0.3
        })
        fullPolyline.show()
      }
    }
  } else if (regionType === 'close-secondary') {
    return
  }
}

/** 地图发来的“区域路径悬停离开”事件 */
function handleRegionHoverOut (payload) {
  const { regionType, id, closeId, key } = payload || {}
  if (!regionType || !id) return

  let regionKey = null

  if (regionType === 'base-close') {
    regionKey = `close:${id}`
    const regionPolyline = regionBaseClosePolylines.get(id)
    setRegionHoverStyle(regionPolyline, regionType, false)
  } else if (regionType === 'close-secondary') {
    const compositeKey = key || `${closeId}__${id}`
    regionKey = `sec:${compositeKey}`
  }

  if (hoveredRegionKey.value === regionKey) {
    hoveredRegionKey.value = null
  }

  hoverTooltip.value.visible = false

  if (regionType === 'base-close') {
    const closeIdForFull = id
    const isTempShown = hoverTempCloseFull.get(closeIdForFull)
    const fullPolyline = closeFullPolylines.get(closeIdForFull)
    const closeItem = results.value.find(
      (r) => r.type === 'close' && r.id === closeIdForFull
    )

    if (isTempShown && fullPolyline && closeItem) {
      hoverTempCloseFull.delete(closeIdForFull)
      fullPolyline.setOptions(STYLE_CLOSE_FULL)
      if (!closeItem.expanded) {
        fullPolyline.hide()
      }
    }
  }
}

/**
 * 排序后的结果展示：
 * 主疑 → 按顺序的密接 → 它展开时的次密接
 * 特殊：
 *  - 如果该密接展开但没有任何次密接 → 插入“无次密接”提示
 *  - 如果整个疑似没有任何密接 → 在疑似下面插入“无密接”提示
 */
const visibleResults = computed(() => {
  const all = results.value
  const ordered = []

  const base = all.find((item) => item.type === 'base')
  if (base) ordered.push(base)

  const closeList = all.filter((item) => item.type === 'close')
  const secondaryList = all.filter((item) => item.type === 'secondary')

  closeList.forEach((close) => {
    ordered.push(close)

    if (close.expanded) {
      const children = secondaryList.filter(
        (sec) => sec.parentId === close.id
      )

      if (children.length > 0) {
        ordered.push(...children)
      } else {
        ordered.push({
          id: `no-secondary-${close.id}`,
          type: 'no-secondary',
          parentId: close.id,
          visualize: true,
          // 无次密接提示
          message: '该密接暂无次密接记录'
        })
      }
    }
  })

  // 新增：如果没有任何密接，则在疑似下面插入“无密接”提示卡片
  if (base && closeList.length === 0) {
    ordered.push({
      id: `no-close-${base.id}`,
      type: 'no-secondary',
      parentId: base.id,
      visualize: true,
      // 无密接提示
      message: '该疑似暂无密接记录'
    })
  }

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
 * 搜索
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
    /^\d+$/.test(kw) &&
    Number.isFinite(idNum) &&
    idNum >= 0 && idNum <= 99999

  if (!isIntId) {
    alert('ID 必须为 0~99999 的整数，请检查输入')
    return
  }

  loading.value = true
  try {
    const items = await fetchContactGraphFromApi(kw)

    if (!items || items.length === 0) {
      results.value = []
      clearAllPolylines()
      emit('clear-map')
      return
    }

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

    const closeList = results.value.filter((r) => r.type === 'close')
    selectAll.value =
      closeList.length > 0 &&
      closeList.every((r) => r.visualize)

    initPolylinesForCurrentData()
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
 * - secondary：切换“密接-次密接区域路径（青）”显隐（按二元主键）
 * - no-secondary：纯提示卡片，不做任何动作
 */
const onCardClick = (item) => {
  if (item.type === 'base' || item.type === 'no-secondary') return

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
    const key = `${item.parentId}__${item.id}`
    const region = regionCloseSecondaryPolylines.get(key)
    if (region) {
      if (!wasVisible && item.visualize) {
        region.show()
      } else if (wasVisible && !item.visualize) {
        region.hide()
      }
    }
  }
}

/**
 * 密接卡片右侧“展开/收起”按钮：
 *  - 展开：只控制密接完整路径显隐，次密接保持当前可见状态（但列表中只有在 expanded 才会渲染）
 *  - 收起：隐藏密接完整路径，同时将该密接下的所有次密接事件框隐藏（visualize = false，区域路径隐藏）
 */
const toggleExpand = (item) => {
  if (item.type !== 'close') return

  const wasExpanded = item.expanded
  item.expanded = !item.expanded

  // 控制密接完整路径（橙色）
  const poly = closeFullPolylines.get(item.id)
  if (poly) {
    if (!wasExpanded && item.expanded) {
      // 由收起 → 展开：显示完整路径
      poly.show()
    } else if (wasExpanded && !item.expanded) {
      // 由展开 → 收起：隐藏完整路径
      poly.hide()
    }
  }

  // 如果是【由展开 → 收起】状态变化，则把该密接下所有次密接全部隐藏
  if (wasExpanded && !item.expanded) {
    const secondaries = results.value.filter(
      (r) => r.type === 'secondary' && r.parentId === item.id
    )

    secondaries.forEach((sec) => {
      // 1) 逻辑上统一设为不可视
      if (sec.visualize) {
        sec.visualize = false
      }

      // 2) 隐藏对应的“密接-次密接 区域路径（青色）”
      const key = `${item.id}__${sec.id}`
      const region = regionCloseSecondaryPolylines.get(key)
      if (region) {
        region.hide()
      }
    })
  }
}

/**
 * 顶部“全选”：
 * - 只控制密接卡片 visualize
 * - 同时控制所有“疑似-密接 区域路径（黄）”显隐
 * - 当取消全选（next === false）时：
 *    1）把当前“已展开”的密接事件框收起（expanded = false，隐藏密接完整路径）
 *    2）把所有次密接事件框隐藏（visualize = false，隐藏密接-次密接区域路径）
 */
const toggleSelectAll = (event) => {
  const next = event.target.checked // true：全选；false：取消全选
  selectAll.value = next

  // 1. 操作所有【密接】事件框
  const closeList = results.value.filter((r) => r.type === 'close')

  closeList.forEach((item) => {
    const wasVisible = item.visualize

    // (1) 无论是全选还是取消全选，都同步密接的 visualize
    item.visualize = next

    // (2) 同步“疑似-密接 区域路径（黄）”显隐
    const region = regionBaseClosePolylines.get(item.id)
    if (region) {
      if (!wasVisible && next) {
        // 原本不可见 → 全选后显示
        region.show()
      } else if (wasVisible && !next) {
        // 原本可见 → 取消全选后隐藏
        region.hide()
      }
    }

    // (3) 只要是“取消全选”（next === false），就收起当前所有已展开的密接事件框
    if (!next && item.expanded) {
      item.expanded = false

      // 收起时隐藏密接完整路径（橙色）
      const fullPolyline = closeFullPolylines.get(item.id)
      if (fullPolyline) {
        fullPolyline.hide()
      }
    }
  })

  // 2. 只要是取消全选（next === false），就把所有次密接事件框隐藏
  if (!next) {
    const secondaryList = results.value.filter((r) => r.type === 'secondary')

    secondaryList.forEach((sec) => {
      if (sec.visualize) {
        sec.visualize = false
      }
      const key = `${sec.parentId}__${sec.id}`
      const region = regionCloseSecondaryPolylines.get(key)
      if (region) {
        region.hide()
      }
    })
  }
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
  position: relative;
  flex: 1 1 70%;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  margin-right: 12px;
}

/* 悬停信息框 */
.map-tooltip {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  max-width: 220px;
  pointer-events: none;
}

.tooltip-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 2px;
}

.tooltip-row:last-child {
  margin-bottom: 0;
}

.tooltip-label {
  color: #666;
  min-width: 70px;
}

.tooltip-value {
  color: #222;
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

.select-all input[type='checkbox'] {
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
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
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

/* “无次密接 / 无密接”提示卡片 */
.result-card.no-secondary-card {
  background: #fcfcfc;
  border-style: dashed;
  border-color: #ddd;
  cursor: default;
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
  background: #ff0000;  /* 疑：深红，与疑似完整路径一致 */
  color: #fff;
}

.badge-close {
  background: #b30086;  /* 密：紫红，与密接完整路径一致 */
  color: #fff;
}

.badge-secondary {
  background: #00b300;  /* 次：绿色，与次密接区域路径一致 */
  color: #fff;
}


/* ID 文本 */
.id-text {
  font-weight: 500;
  color: #333;
}

/* 展开按钮（密接）：60° 锐角箭头，放大一倍 */
.expand-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1677ff;
}

.expand-btn:hover {
  color: #0958d9;
}

/* SVG 箭头尺寸（放大一倍） */
.arrow-icon {
  width: 28px;
  height: 28px;
}

/* “无次密接 / 无密接”提示内容 */
.no-secondary-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bbb;
}
.no-secondary-text {
  font-size: 13px;
  color: #888;
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
