import { createRouter, createWebHistory } from 'vue-router'
import ContactTracingView from '../views/ContactTracingView.vue'
import Home from '../components/Home.vue'


const routes = [
  {
    path: '/Home',
    component: Home
  },
  {
    path: '/ContactTracingView',
    component: ContactTracingView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
