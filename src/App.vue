<script setup>
import { RouterLink, RouterView } from 'vue-router'


</script>

<template>
  <nav>
    <RouterLink to="/Home">首页</RouterLink>
    <RouterLink to="/ContactTracingView">地图</RouterLink>
  </nav>
  <RouterView />
</template>

<style scoped>

</style>
