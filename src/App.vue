<script setup>
import { RouterLink, RouterView } from 'vue-router'


</script>

<template>
  <nav class="navagate">
    <RouterLink to="/Home" active-class="class-active">首页</RouterLink>
    <RouterLink to="/ContactTracingView" active-class="class-active">地图</RouterLink>
  </nav>
  <RouterView />
</template>

<style scoped>

</style>
