import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App'
import About from './components/About'
import MainPage from "@/components/MainPage"
import Editor from '@/components/Editor'
import Vuex from 'vuex'
import loader from "vue-ui-preloader";

Vue.config.productionTip = false
Vue.use(VueRouter)
Vue.use(Vuex);
Vue.use(loader);

const routes = [
  { path: '/', component: MainPage },
  { path: '/about', component: About },
  { path: '/editor', name: 'editor', component: Editor }
]

const router = new VueRouter({
  routes
})

new Vue({
  render: h => h(App),
  router: router
}).$mount('#app')
