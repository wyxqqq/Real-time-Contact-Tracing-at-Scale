<script setup>
import { RouterLink, RouterView } from 'vue-router'


</script>

<template>
  <nav class="navagate">
    <RouterLink to="/Home">首页</RouterLink>
    <RouterLink to="/ContactTracingView">地图</RouterLink>
  </nav>
  <RouterView />
</template>

<style scoped>
nav {
  background-color: #2c3e50;
  position: fixed;
  height: 10%;
  width: 100%;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: sticky;
  /* 导航粘性定位，滚动时不消失 */
  top: 0;
  z-index: 999;
  /* 确保导航在最上层，不被展示区内容覆盖 */
}
</style>
