<template>
    <div>
    <a class='dropdown-trigger btn btn-flat havelock white-text' style="font-size:x-small" href='#' data-target='count_drop' id="count_drop_a" v-on:click="onClickText">Loaded {{ loadedCount}} {{ loadedCount > 1 || loadedCount === 0 ? 'notes' : 'note' }}</a>

    <ul id='count_drop' class='dropdown-content'>
        <li v-on:click="onOptionChoice">10</li>
        <li v-on:click="onOptionChoice">15</li>
        <li v-on:click="onOptionChoice">20</li>
        <li v-on:click="onOptionChoice">25</li>
        <li v-on:click="onOptionChoice">50</li>
        <li v-on:click="onOptionChoice">100</li>
    </ul>
    </div>
</template>

<script>
import M from 'materialize-css';

export default {
    name: 'NoteCountDropdown',
    props: [
        'loadedCount'
    ],
    emits: [
        'countChanged'
    ],
    mounted: function() {
      const elems = document.getElementById("count_drop_a");
      M.Dropdown.init(elems, { 
        alignment: 'right', 
        coverTrigger: false, 
        onCloseStart: this.onDropdownCloseStart,
        onOpenStart: this.selectCurrentIndex,
        onCloseEnd: this.unselectAll
      });
    },
    methods: {
        onOptionChoice(e){
            const count = Number.parseInt(e.target.innerText);
            this.$store.commit({type: 'updateNoteCount', noteCount: count});
            this.$emit('countChanged');
        },
        selectCurrentIndex(){
            const elems = document.getElementById("count_drop").children;   
            for(let i = 0; i < elems.length; i++){
                if(elems[i].innerText == this.$store.getters.noteCount){
                    const li = elems[i];
                    li.setAttribute('class', 'selected-option');
                }
            }
        },
        unselectAll(){
            const countDrop = document.getElementById("count_drop")
            if(countDrop !== undefined && countDrop !== null){
                const elems = countDrop.children;   
                for(let i = 0; i < elems.length; i++){
                    const li = elems[i];
                    li.removeAttribute('class');
                }
            }
        }
    }
}
</script>

<style>
.selected-option {
  background-color: var(--color-primary) !important;
  color: white !important;
}
</style>