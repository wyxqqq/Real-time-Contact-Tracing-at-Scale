<template>
  <div class="ContactShow">
    <div class="map-container">
      <AMapComponent 
        :selectedTime="selectedTime"
        :contactData="filteredContacts"
      />
    </div>
    <div class="chart-container">
      <ContactChart 
        :data="timeSeriesData" 
        @timeChange="handleTimeChange"
      />
    </div>
  </div>
</template>

<script setup name="ContactShow">
import AMapComponent from '@/components/AMapComponent.vue'
import ContactChart from '@/components/ContactChart.vue'
import { ref, computed, onMounted } from 'vue'
import contactData from '@/data/contacts.json'

// 时间范围状态 (0-10000)
const selectedTime = ref(0)
const rawContacts = ref([])

// 加载数据
onMounted(() => {
  rawContacts.value = contactData
})

// 处理时间变化
const handleTimeChange = (time) => {
  selectedTime.value = time
}

// 生成时间序列数据 (每100单位一个点)
const timeSeriesData = computed(() => {
  const timePoints = Array.from({ length: 101 }, (_, i) => i * 100)
  return timePoints.map(time => ({
    time,
    count: rawContacts.value.filter(c => c.time <= time).length
  }))
})

// 过滤当前时间点前的联系人数据
const filteredContacts = computed(() => {
  return rawContacts.value.filter(c => c.time <= selectedTime.value)
})
</script>

<style scoped>
.ContactShow {
  top: 0;
  display: flex;
  flex-wrap: wrap;
  background-color: #f5f7fa;
}

.map-container {
  flex: 8;
  height: 80%;
}

.chart-container {
  flex: 2;
  height: 20%;
}
</style>