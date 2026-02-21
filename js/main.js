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
                    :disabled="card.completedDate"
                />
                <span :class="{ completed: item.completed }">{{ item.text }}</span>
            </li>
        </ul>
        <div v-if="card.completedDate" class="completed-date">
             Завершено: {{ card.completedDate }}
        </div>
    </div>
    `,
    props: {
        card: Object,
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
          <Card :card="card" @update-completion="handleUpdateCompletion" />
        </div>
    </div>
    `,
    props: {
        cards: Array,
        columnIndex: Number,
        title: String
    },
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
                            <button class="btn-remove-icon" @click="removeItem(index)" :disabled="isCardLocked">×</button>
                            <input v-model="item.text" placeholder="Введите пункт" :disabled="isCardLocked" />
                        </li>
                    </ul>
                
                <button class="btn-add" @click="addItem" :disabled="newCardItems.length >= 5">
                    + Добавить пункт
                </button>
                
                <button class="btn-submit" @click="addCard" :disabled="isAddCardDisabled">
                    Создать карточку
                </button>
                
                <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            </div>

            <column
                v-for="(column, index) in columns"
                :key="index"
                :cards="column.cards"
                :columnIndex="index"
                :title="columnTitles[index]"
                @update-completion="handleUpdateCompletion"
             />
        </div>
    `,
    data() {
        return {
            columnTitles: ['Нужно сделать', 'В процессе', 'Завершено'],
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
            const firstColumnFull = this.columns[0].cards.length >= this.columns[0].maxCards;
            const secondColumnFull = this.columns[1].cards.length >= this.columns[1].maxCards;

            if (secondColumnFull) return true;

            return (
                firstColumnFull ||
                this.newCardItems.length < 3 ||
                this.newCardItems.length > 5 ||
                !this.newCardContent.trim()
            );
        },
    },
    methods: {
        addItem() {
            if (this.newCardItems.length < 5) {
                this.newCardItems.push({ text: '', completed: false });
                this.errorMessage = '';
            }
        },
        removeItem(index) {
            this.newCardItems.splice(index, 1);
        },
        addCard() {
            const newCard = {
                id: Date.now(),
                content: this.newCardContent,
                items: this.newCardItems.map(item => ({ ...item })),
                completedDate: null
            };
            this.columns[0].cards.push(newCard);
            this.resetCardCreator();
            this.saveData();
        },
        resetCardCreator() {
            this.newCardContent = '';
            this.newCardItems = [];
            this.errorMessage = '';
        },
        handleUpdateCompletion(cardId) {
            let currentColumnIndex = -1;
            let card = null;

            for (let i = 0; i < this.columns.length; i++) {
                card = this.columns[i].cards.find(c => c.id === cardId);
                if (card) {
                    currentColumnIndex = i;
                    break;
                }
            }

            if (!card) return;

            const completedCount = card.items.filter(item => item.completed).length;
            const totalCount = card.items.length;
            const percent = (completedCount / totalCount) * 100;

            if (currentColumnIndex === 0 && percent >= 50) {
                this.moveCard(card, 0, 1);
            } else if (currentColumnIndex === 1 && percent === 100) {
                card.completedDate = new Date().toLocaleString();
                this.moveCard(card, 1, 2);
            }
            this.saveData();
        },
        moveCard(card, from, to) {
            if (this.columns[to].cards.length < this.columns[to].maxCards) {
                this.columns[from].cards = this.columns[from].cards.filter(c => c.id !== card.id);
                this.columns[to].cards.push(card);
            } else {
                this.errorMessage = `Столбец "${this.columnTitles[to]}" переполнен!`;
                // Откатываем чекбокс, если нельзя переместить
                card.items.forEach(i => i.completed = false);
            }
        },
        saveData() {
            localStorage.setItem('notepadData', JSON.stringify(this.columns));
        },
        loadData() {
            const savedData = localStorage.getItem('notepadData');
            if (savedData) {
                this.columns = JSON.parse(savedData);
            }
        }
    },
    mounted() {
        this.loadData();
    }
});

new Vue({ el: '#app' });