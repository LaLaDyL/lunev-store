// Корзина в localStorage
class Cart {
    constructor() {
        this.items = this.loadCart();
        this.updateCartCounter();
    }

    // Загрузка корзины из localStorage
    loadCart() {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    }

    // Сохранение корзины в localStorage
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.updateCartCounter();
    }

    // Добавление товара в корзину
    addToCart(product, selectedMemory = null) {
        const existingItem = this.items.find(item => 
            item.id === product.id && item.memory === selectedMemory
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                main_image: product.main_image,
                memory: selectedMemory || product.memory_options[0],
                color: product.color_options,
                quantity: 1
            });
        }

        this.saveCart();
        this.showAddToCartNotification();
    }

    // Удаление товара из корзины
    removeFromCart(productId, memory) {
        this.items = this.items.filter(item => 
            !(item.id === productId && item.memory === memory)
        );
        this.saveCart();
    }

    // Изменение количества товара
    updateQuantity(productId, memory, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId, memory);
            return;
        }

        const item = this.items.find(item => 
            item.id === productId && item.memory === memory
        );
        
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
        }
    }

    // Получение общей суммы
    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Получение количества товаров
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Обновление счетчика в хедере
    updateCartCounter() {
        const cartCounter = document.querySelector('.cart-counter');
        const totalItems = this.getTotalItems();
        
        if (cartCounter) {
            cartCounter.textContent = totalItems;
            cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    // Уведомление о добавлении в корзину
    showAddToCartNotification() {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = 'add-to-cart-notification';
        notification.innerHTML = `
            <span>✅ Товар добавлен в корзину!</span>
        `;
        
        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Убираем уведомление через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Создаем глобальный экземпляр корзины
const cart = new Cart();

// Инициализация корзины на странице товара
function initProductPage() {
    const buyButton = document.querySelector('.buy-button');
    if (buyButton) {
        buyButton.addEventListener('click', function() {
            // Получаем выбранный объем памяти
            const selectedMemory = document.querySelector('.memory.active') || 
                                 document.querySelector('.memory');
            
            // Находим данные товара
            const productId = parseInt(new URLSearchParams(window.location.search).get('id'));
            const product = products.find(p => p.id === productId);
            
            if (product) {
                cart.addToCart(product, selectedMemory ? selectedMemory.textContent : null);
            }
        });
    }

    // Обработчики для выбора памяти
    const memoryButtons = document.querySelectorAll('.memory');
    memoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            memoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initProductPage();
});