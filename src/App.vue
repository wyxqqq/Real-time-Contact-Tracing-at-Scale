<script setup>
import { RouterLink, RouterView } from 'vue-router'


</script>

<template>
  <!-- 导航区 -->
  <nav class="navagate">
    <RouterLink :to="{name:'Home'}" active-class="class-active">首页</RouterLink>
    <RouterLink :to="{name:'ContactSearch'}" active-class="class-active">密接人员轨道绘制</RouterLink>
    <RouterLink :to="{name:'ContactShow'}" active-class="class-active">密接人员展示</RouterLink>
  </nav>
  <!-- 展示区 -->
  <RouterView class="all"/>
</template>

<style scoped>

</style>
