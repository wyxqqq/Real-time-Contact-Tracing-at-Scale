<script setup>
import { RouterLink, RouterView } from 'vue-router'


</script>

<template>
  <!-- 导航区 -->
  <nav class="navagate">
    <RouterLink :to="{name:'Home'}" active-class="class-active">首页</RouterLink>
    <RouterLink :to="{name:'ContactSearch'}" active-class="class-active">单目标密接事件轨迹查询</RouterLink>
    <RouterLink :to="{name:'ContactShow'}" active-class="class-active">全范围密接事件数量概览</RouterLink>
  </nav>
  <!-- 展示区 -->
  <RouterView class="all"/>
</template>

<style scoped>

</style>
