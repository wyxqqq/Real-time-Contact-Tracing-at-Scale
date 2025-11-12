import { createRouter, createWebHistory } from 'vue-router'
import ContactTracingView from '../views/ContactTracingView.vue'
import ContactShow from '../views/ContactShow.vue'
import Home from '../views/Home.vue'


const routes = [
  {
    name:'Home',
    path: '/Home',
    component: Home
  },
  {
    name:'ContactTracingView',
    path: '/ContactTracingView',
    component: ContactTracingView
  },
  {
    name:'ContactShow',
    path:'/ContactShow',
    component:ContactShow
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
