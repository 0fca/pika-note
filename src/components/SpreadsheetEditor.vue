<template>
  <div class="spreadsheet-editor">
    <div class="spreadsheet-toolbar">
      <button class="btn-action spreadsheet-action" type="button" @click="addRow">
        <span class="material-symbols-outlined">add_row_below</span>
        <span>Add row</span>
      </button>
      <button class="btn-action spreadsheet-action" type="button" @click="addColumn">
        <span class="material-symbols-outlined">view_column_2</span>
        <span>Add column</span>
      </button>
    </div>

    <div class="spreadsheet-surface">
      <vue-excel-editor
        ref="grid"
        v-model="tableRows"
        filter-row
        no-header-edit
        disable-panel-setting
        height="540px"
        width="100%"
      >
        <vue-excel-column
          v-for="column in tableColumns"
          :key="column.field"
          :field="column.field"
          :label="column.label"
          type="string"
          width="160px"
        />
      </vue-excel-editor>
    </div>
  </div>
</template>

<script>
import {
  cloneTabularState,
  createDefaultColumns
} from '@/services/tabularNoteService'

export default {
  name: 'SpreadsheetEditor',
  props: {
    modelValue: {
      type: Object,
      default() {
        return {
          columns: createDefaultColumns(),
          rows: []
        }
      }
    }
  },
  emits: ['update:modelValue'],
  data() {
    const initialState = cloneTabularState(this.modelValue)
    return {
      tableColumns: initialState.columns,
      tableRows: initialState.rows,
      syncingFromParent: false
    }
  },
  watch: {
    modelValue: {
      deep: true,
      handler(newValue) {
        const nextState = cloneTabularState(newValue)
        this.syncingFromParent = true
        this.tableColumns = nextState.columns
        this.tableRows = nextState.rows
        this.$nextTick(() => {
          this.syncingFromParent = false
        })
      }
    },
    tableColumns: {
      deep: true,
      handler() {
        this.emitChange()
      }
    },
    tableRows: {
      deep: true,
      handler() {
        this.emitChange()
      }
    }
  },
  methods: {
    emitChange() {
      if (this.syncingFromParent) {
        return
      }
      this.$emit('update:modelValue', cloneTabularState({
        columns: this.tableColumns,
        rows: this.tableRows
      }))
    },
    addRow() {
      const emptyRecord = this.tableColumns.reduce((record, column) => {
        record[column.field] = ''
        return record
      }, {})

      this.tableRows = [...this.tableRows, emptyRecord]
    },
    addColumn() {
      const nextIndex = this.tableColumns.length + 1
      const column = {
        field: `column_${nextIndex}_${Date.now()}`,
        label: `Column ${nextIndex}`
      }

      this.tableColumns = [...this.tableColumns, column]
      this.tableRows = this.tableRows.map((row) => ({
        ...row,
        [column.field]: ''
      }))
    }
  }
}
</script>

<style scoped>
.spreadsheet-editor {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.spreadsheet-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.spreadsheet-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spreadsheet-surface {
  overflow: auto;
  border-radius: 10px;
}
</style>
