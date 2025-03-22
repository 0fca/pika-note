<template>
    <button class="btn btn-flat havelock white-text" v-on:click="$emit('orderChange')">
        {{ this.$store.getters.order == 0 ? 'DESC' : "ASC" }}
    </button>
</template>
<script>
export default {
    name: 'OrderSwitch',
}
</script>