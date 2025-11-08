import { createRouter, createWebHistory } from 'vue-router'
import ContactTracingView from '../views/ContactTracingView.vue'
import ContactShow from '../views/ContactShow.vue'
import Home from '../views/Home.vue'


const routes = [
  {
    path: '/Home',
    component: Home
  },
  {
    path: '/ContactTracingView',
    component: ContactTracingView
  },
  {
    path:'/ContactShow',
    component:ContactShow
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
