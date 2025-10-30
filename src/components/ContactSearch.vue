<!-- 
联系人搜索组件
功能：提供人员ID搜索、联系人列表展示和选择功能
-->
<template>
  <div class="contact-search">
    <div class="search-box">
      <input v-model="personId" placeholder="输入人员ID" />
      <button @click="handleSearch">搜索</button>
    </div>
    <div class="contact-list">
      <div class="select-all">
        <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
        <span>全选</span>
      </div>
      <div class="contact-item" v-for="contact in contacts" :key="contact.id">
        <input type="checkbox" v-model="contact.selected" />
        <span>{{ contact.name }} (ID: {{ contact.id }})</span>
      </div>
    </div>
    <button class="draw-button" @click="handleDraw">绘制轨迹</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const personId = ref('');
const selectAll = ref(false);
const contacts = ref([]);

const emit = defineEmits(['search', 'draw']);

/**
 * 从本地数据库获取联系人数据
 * @param {string|number} id - 人员ID
 * @returns {Promise<Array>} 联系人列表
 */
const fetchContactsFromDB = async (id) => {
  try {
    const response = await fetch(`/api/contacts?id=${id}`);
    if (!response.ok) throw new Error('请求失败');
    return await response.json();
  } catch (error) {
    console.error('获取联系人数据失败:', error);
    return [];
  }
};

const handleSearch = async () => {
  if (!personId.value.trim()) return;
  
  const data = await fetchContactsFromDB(personId.value);
  contacts.value = data.map(item => ({ ...item, selected: false }));
  emit('search', personId.value);
};

const toggleSelectAll = () => {
  contacts.value.forEach(contact => {
    contact.selected = selectAll.value;
  });
};

const handleDraw = () => {
  const selectedContacts = contacts.value.filter(c => c.selected);
  emit('draw', selectedContacts);
};
</script>

<style scoped>
.contact-search {
  padding: 20px;
  background: #f5f5f5;
  overflow-y: auto;
}

.search-box {
  margin-bottom: 20px;
}

.search-box input {
  width: 70%;
  padding: 8px;
}

.search-box button {
  width: 25%;
  padding: 8px;
  margin-left: 5%;
}

.contact-list {
  margin-bottom: 20px;
}

.contact-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.select-all {
  padding: 8px 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.draw-button {
  width: 100%;
  padding: 10px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
