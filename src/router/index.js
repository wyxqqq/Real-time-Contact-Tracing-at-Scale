import { createRouter, createWebHistory } from 'vue-router'
import ContactShow from '../views/ContactShow.vue'
import Home from '../views/Home.vue'
import ContactSearch from '../views/ContactSearch.vue'


const routes = [
  {
    name: 'Home',
    path: '/Home',
    component: Home
  },
  {
    name: 'ContactShow',
    path: '/ContactShow',
    component: ContactShow
  },
  {
    name: 'ContactSearch',
    path: '/ContactSearch',
    component: ContactSearch
  },
  {
    path: '/',
    name: 'Home_init',
    component: Home
  }

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
