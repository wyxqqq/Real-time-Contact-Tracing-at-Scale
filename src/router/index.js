import { createRouter, createWebHistory } from 'vue-router'
import ContactTracingView from '../views/ContactTracingView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: ContactTracingView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
