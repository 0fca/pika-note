import {createApp} from 'vue'
import {createRouter,createWebHistory} from 'vue-router'
import App from './App'
import About from './components/About'
import MainPage from "@/components/MainPage"
import Editor from '@/components/Editor'
import { createStore } from 'vuex'
import loader from "vue-ui-preloader";

const routes = [
  { path: '/', component: MainPage },
  { path: '/about', component: About },
  { path: '/editor', name: 'editor', component: Editor }
]

const history =  createWebHistory()
const router = createRouter({routes: routes, history: history})
const app = createApp(App);
app.use(router)
// Create a new store instance.
const store = createStore({
  state () {
    return {
      rawText: '',
      count: 0,
      content: '',
      name: '',
      limit: 10
    }
  },
  mutations: {
    updateRawText (state, text) {
      if(state.count >= state.limit){
        return;
      }
      state.rawText += text;
    },
    setCharactersCount(state, payload){
      state.count = payload.count;
    },
    increaseCharactersCounter(state){
      if(state.count >= state.limit){
        return;
      }
      state.count++;
    },
    decreaseCharactersCounter(state){
      if(state.count === 0){
        return;
      }
      state.count--;
    },
    updateContent(state, payload){
      state.content = payload.content;
    },
    updateName(state, payload){
      state.name = payload.name;
    }
  },
  getters: {
    count (state) {
      return state.count;
    },
    name(state){
      return state.name;
    },
    content(state){
      return state.content;
    },
    limit(state){
      return state.limit;
    }
  }
});
app.use(store);
app.component('loader', loader)
app.mount('#app')
