Vue.component('Card', {
    template: `
    <div class="card">
        <h3>{{ card.content }}</h3>
        <ul>
            <li v-for="(item, index) in card.items" :key="index">
                <input 
                    type="checkbox" 
                    v-model="item.completed" 
                    @change="updateCompletion" 
                    :disabled="isCheckboxDisabled"
                />
                <span :class="{ completed: item.completed }">{{ item.text }}</span>
            </li>
        </ul>
        <div v-if="card.completedDate && isLastColumn" class="completed-date">
             Завершено: {{ card.completedDate }}
        </div>
    </div>
    `,
    props: {
        card: Object,
        isLastColumn: Boolean,
        columnFull: Boolean,
        columnIndex: Number
    },
    computed: {
        isCheckboxDisabled() {
            // Считаем прогресс прямо в карточке
            const completedCount = this.card.items.filter(i => i.completed).length;
            const total = this.card.items.length;
            // Блокируем в 1-м столбце, если 2-й полон, НО даем нажать последнюю галку для 100%
            if (this.columnIndex === 0 && this.columnFull) {
                if (completedCount === total - 1 && !this.card.items.every(i => i.completed)) {
                    return false; // Разрешаем нажать последнюю, чтобы улетела в 3-й столбец
                }
                return true;
            }
            return false;
        }
    },
    methods: {
        updateCompletion() {
            this.$emit('update-completion', this.card.id);
        }
    }
})

Vue.component('column', {
    template: `
    <div class="column">
        <p>{{ title }}</p>
        <div v-for="card in cards" :key="card.id">
          <Card 
            :card="card" 
            :is-last-column="columnIndex === 2"
            :column-index="columnIndex"
            :column-full="nextColumnFull"
            @update-completion="handleUpdateCompletion" 
          />
        </div>
    </div>
    `,
    props: ['cards', 'columnIndex', 'title', 'nextColumnFull'],
    methods: {
        handleUpdateCompletion(cardId) {
            this.$emit('update-completion', cardId);
        }
    },
})

Vue.component('notepad', {
    template: `
        <div class="notepad">
            <div class="card-creator">
                <h3>Новая задача</h3>
                <input v-model="newCardContent" placeholder="Заголовок карточки" />
                <ul>
                    <li v-for="(item, index) in newCardItems" :key="index" class="creator-item">
                        <button class="btn-remove-icon" @click="removeItem(index)">×</button>
                        <input v-model="item.text" placeholder="Введите текст пункта" />
                    </li>
                </ul>
                
                <button class="btn-add" @click="addItem" :disabled="newCardItems.length >= 5">
                    + Добавить пункт
                </button>
                
                <button class="btn-submit" @click="addCard" :disabled="isAddCardDisabled">
                    Создать карточку
                </button>
                
                <div v-if="errorMessage" class="error-message" style="color: #ff4d4d; margin-top: 10px;">
                    {{ errorMessage }}
                </div>
            </div>

            <column
                v-for="(column, index) in columns"
                :key="index"
                :cards="column.cards"
                :columnIndex="index"
                :title="columnTitles[index]"
                :next-column-full="index === 0 ? columns[1].cards.length >= columns[1].maxCards : false"
                @update-completion="handleUpdateCompletion"
             />
        </div>
    `,
    data() {
        return {
            columnTitles: ['НУЖНО СДЕЛАТЬ', 'В ПРОЦЕССЕ', 'ЗАВЕРШЕНО'],
            columns: [
                { cards: [], maxCards: 3 },
                { cards: [], maxCards: 5 },
                { cards: [], maxCards: 9999 },
            ],
            newCardContent: '',
            newCardItems: [],
            errorMessage: '',
        };
    },
    computed: {
        isAddCardDisabled() {
            const firstFull = this.columns[0].cards.length >= 3;
            const hasEmpty = this.newCardItems.some(item => !item.text.trim());
            return firstFull || this.newCardItems.length < 3 || !this.newCardContent.trim() || hasEmpty;
        },
    },
    methods: {
        addItem() {
            if (this.newCardItems.length < 5) this.newCardItems.push({ text: '', completed: false });
        },
        removeItem(index) {
            this.newCardItems.splice(index, 1);
        },
        addCard() {
            this.columns[0].cards.push({
                id: Date.now(),
                content: this.newCardContent,
                items: this.newCardItems.map(item => ({ ...item, text: item.text.trim() })),
                completedDate: null
            });
            this.newCardContent = '';
            this.newCardItems = [];
            this.saveData();
        },
        handleUpdateCompletion(cardId) {
            let colIdx = -1;
            let card = null;

            this.columns.forEach((col, idx) => {
                const found = col.cards.find(c => c.id === cardId);
                if (found) { card = found; colIdx = idx; }
            });

            if (!card) return;

            const percent = (card.items.filter(i => i.completed).length / card.items.length) * 100;

            if (colIdx === 0) {
                if (percent === 100) {
                    card.completedDate = new Date().toLocaleString();
                    this.moveCard(card, 0, 2);
                } else if (percent >= 50) {
                    this.moveCard(card, 0, 1);
                }
            }
            else if (colIdx === 1) {
                if (percent === 100) {
                    card.completedDate = new Date().toLocaleString();
                    this.moveCard(card, 1, 2);
                } else if (percent < 50) {
                    this.moveCard(card, 1, 0);
                }
            }
            else if (colIdx === 2 && percent < 100) {
                card.completedDate = null;
                const target = (this.columns[1].cards.length < 5) ? 1 : 0;
                this.moveCard(card, 2, target);
            }
            this.saveData();
        },
        moveCard(card, from, to) {
            if (this.columns[to].cards.length < this.columns[to].maxCards) {
                this.columns[from].cards = this.columns[from].cards.filter(c => c.id !== card.id);
                this.columns[to].cards.push(card);
                this.errorMessage = '';
            } else {
                this.errorMessage = `Столбец "${this.columnTitles[to]}" переполнен!`;
                this.loadData();
            }
        },
        saveData() { localStorage.setItem('notepadData', JSON.stringify(this.columns)); },
        loadData() {
            const data = localStorage.getItem('notepadData');
            if (data) this.columns = JSON.parse(data);
        }
    },
    mounted() { this.loadData(); }
});

new Vue({ el: '#app' });