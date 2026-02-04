<template>
    <p>
        Working now, please wait...
    </p>
</template>

<script>
    import NoteService from "@/services/noteService";
    export default {
        name: 'NoteRedirectHandler',
        mounted: async function() {
            const noteService = new NoteService();
            const note = await noteService.getNote(this.$route.query.id);
            const content = JSON.parse(note.content);
            this.$store.commit({type: 'updateId', id: this.$route.query.id});
            this.$store.commit({type: 'updateContent', content: content});
            this.$store.commit({type: 'updateName', content: note.humanName});
            this.$router.push('/editor');
        }
    }
</script>