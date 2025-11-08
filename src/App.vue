<script setup>
import { RouterLink, RouterView } from 'vue-router'


</script>

<template>
  <!-- 导航区 -->
  <nav class="navagate">
    <RouterLink to="/Home" active-class="class-active">首页</RouterLink>
    <RouterLink to="/ContactTracingView" active-class="class-active">密接人员轨道绘制</RouterLink>
    <RouterLink to="/ContactShow" active-class="class-active">密接人员展示</RouterLink>
  </nav>
  <!-- 展示区 -->
  <RouterView />
</template>

<style scoped>

</style>
