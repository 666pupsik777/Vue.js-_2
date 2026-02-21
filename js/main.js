Vue.component('Card', {
    template: `
    <div class="card">
        <textarea v-model="card.content" placeholder="Введите заметку" :disabled="card.isDone"></textarea>
        <ul>
             <li v-for="(item, index) in card.items" :key="index">
                 <input type="checkbox" v-model="item.completed" @change="updateCompletion" :disabled="!card.isDone" />
                 <span :class="{ completed: item.completed }">{{ item.text }}</span>
             </li>
         </ul>
        <div v-if="card.completedDate">
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
        },

        markAsDone() {
            this.$emit('mark-as-done', this.card.id);
        },
    }
})

// ... компоненты Card и Column остаются почти такими же, добавим только заголовки
Vue.component('column', {
    template: `
    <div class="column">
        <h2>{{ title }}</h2>
        <div v-for="card in cards" :key="card.id">
          <Card :card="card" @update-completion="handleUpdateCompletion(card.id)" />
        </div>
    </div>
    `,
    props: ['cards', 'columnIndex', 'title'],
    methods: {
        handleUpdateCompletion(cardId) {
            this.$emit('update-completion', cardId);
        }
    }
})

Vue.component('notepad', {
    template: `
        <div class="notepad">
            <column
                v-for="(column, index) in columns"
                :key="index"
                :cards="column.cards"
                :columnIndex="index"
                :title="columnTitles[index]"
                @update-completion="handleUpdateCompletion"
             />
            
            <div class="card-creator">
                <h3>Новая карточка</h3>
                <textarea v-model="newCardContent" placeholder="Заголовок заметки..."></textarea>
                
                <div class="items-list">
                    <div v-for="(item, index) in newCardItems" :key="index" class="item-row">
                        <input v-model="item.text" placeholder="Пункт плана...">
                        <button class="btn-delete" @click="removeItem(index)">×</button>
                    </div>
                </div>
                
                <button class="btn-main btn-add-item" @click="addItem">+ Добавить пункт</button>
                <button class="btn-main" @click="addCard" :disabled="!newCardContent || newCardItems.length === 0">Создать карточку</button>
            </div>
        </div>
    `,
    data() {
        return {
            columnTitles: ['Нужно сделать', 'В процессе', 'Завершено'],
            columns: [
                { cards: [] },
                { cards: [] },
                { cards: [] },
            ],
            newCardContent: '',
            newCardItems: [],
        };
    },
      methods: {
        addItem() {
            this.newCardItems.push({ text: '', completed: false });
        },
        removeItem(index) {
            this.newCardItems.splice(index, 1);
        },
        addCard() {
            const newCard = {
                id: Date.now(),
                content: this.newCardContent,
                items: this.newCardItems.map(item => ({ ...item })), // Копируем пункты
                completedDate: null,
                isDone: true, // Блокируем карточку после добавления
            };
            this.columns[0].cards.push(newCard);
            this.resetCardCreator();
        },
        resetCardCreator() {
            this.newCardContent = '';
            this.newCardItems = [];
            this.isCardLocked = false; // Сброс блокировки (если нужно)
        },
        moveCard({ cardId, fromColumnIndex }) {
            const card = this.columns[fromColumnIndex].cards.find(c => c.id === cardId);
            if (card) {
                this.columns[fromColumnIndex].cards = this.columns[fromColumnIndex].cards.filter(c => c.id !== cardId);
                this.columns[fromColumnIndex + 1].cards.push(card);
            }
        },
        handleUpdateCompletion(cardId) {
            const card = this.columns.flatMap(col => col.cards).find(c => c.id === cardId);
            if (card && card.isDone) { // Проверяем, что карточка завершена
                const completedCount = card.items.filter(item => item.completed).length;
                const totalCount = card.items.length;

                if (totalCount > 0) {
                    const completionPercentage = (completedCount / totalCount) * 100;

                    if (completionPercentage >= 50 && this.columns[0].cards.includes(card)) {
                        this.moveCard({ cardId, fromColumnIndex: 0 });
                    } else if (completionPercentage === 100 && this.columns[1].cards.includes(card)) {
                        this.moveCard({ cardId, fromColumnIndex: 1 });
                        card.completedDate = new Date().toLocaleString();
                    }
                }
            }
        },
        handleMarkAsDone(cardId) {
            const card = this.columns.flatMap(col => col.cards).find(c => c.id === cardId);
            if (card) {
                card.isDone = true; // Помечаем карточку как завершенную
                this.handleUpdateCompletion(cardId); // Активируем проверку условий перемещения
            }
        },
    },
})

let app = new Vue({
    el: '#app',
});