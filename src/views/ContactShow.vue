<template>
  <div class="ContactShow">
    这个页面展示的是全体密接人员在地图上的显示。
    
  </div>
</template>

<script setup lang="ts" name="Home">

</script>

<style scoped>
.ContactShow {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  align-items: center;
  display: flex;
  /* 减去导航栏高度 */
  min-height: calc(100vh - 60px);
  /* margin-top: 60px; */
  flex-wrap: wrap;
  /* padding: 20px; 增加内边距 */
  /* background-color: #f5f7fa; */
  /* 浅灰背景 */
}
</style>