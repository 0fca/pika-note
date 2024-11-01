<template>
    <div class="">
        <h2>You have been successfully logged in</h2>
        <small>You will be redirected to note list in about 2 seconds.</small>
    </div>
 </template>

<script>
export default {
    name:"Callback",
    mounted: function() {
        setTimeout(() => {
            this.$router.push({ path: "/"})
        }, 2000);
    }
}
</script>