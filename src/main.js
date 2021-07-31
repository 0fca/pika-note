import {createApp} from 'vue'
import VueRouter from 'vue-router'
import App from './App'
import About from './components/About'
import MainPage from "@/components/MainPage"
import Editor from '@/components/Editor'
import Vuex from 'vuex'
import loader from "vue-ui-preloader";

const routes = [
  { path: '/', component: MainPage },
  { path: '/about', component: About },
  { path: '/editor', name: 'editor', component: Editor }
]

const router = new VueRouter({
  mode: 'history',
  routes
})

createApp({
  render: h => h(App),
  router: router,
  Vuex,
  loader
}).mount('#app')
