document.addEventListener("DOMContentLoaded", function()
{
    // this is an example js script of how a checkout could be constructed, feel free to move, modify or adapt this in any way.

    // our base cart div, where we will duplicate the items and append to.
    const cart = document.getElementById('cart-example');

    // our cart template to clone
    const item_template = document.querySelector('[data-cart-item]');
    item_template.remove(); // remove the empty template before populating

    (StripeCheckout.items).forEach(item =>
        createCartItem(item)
    );

    // This is the basic function that creates and sets the data that we want to show in our checkout
    // however this function can be anything, it doesn't affect the plugin in any way. It is purely
    // visual.
    function createCartItem(item) {
        const element = cart.appendChild(item_template.cloneNode(true));
        element.dataset.cartItem = item.sku;
        element.querySelector('[data-item-image]').src = item.extras.image;
        element.querySelector('[data-item-name]').textContent = item.sku;
        element.querySelector('[data-item-quantity]').textContent = item.quantity;
        element.querySelector('[data-item-price]').textContent = item.extras.price + ' €';

        // optional elements
        const decreaser = element.querySelector('[data-decrease-quantity]');
        if (decreaser) {
            decreaser.dataset.itemSku = item.sku;
            element.querySelector('[data-item-sku]').dataset.itemSku = item.sku;
        }

        const increaser = element.querySelector('[data-increase-quantity]');
        if (increaser) {increaser.dataset.itemSku = item.sku;}

        const deleter = element.querySelector('[data-remove-from-cart]');
        if (deleter) {deleter.dataset.removeFromCart = item.sku;}
    }

    document.addEventListener('click', function (event) {
        if (!event.target.matches('[data-decrease-quantity], [data-increase-quantity]')) return;

        const button = event.target;
        updateQuantity(button);

    }, false);

    function updateQuantity(element) {
        const item = element.closest('[data-cart-item');
        const sku = item.dataset.cartItem;
        item.querySelector('[data-item-quantity]').textContent = StripeCheckout.getProduct(sku).quantity;
    }

    if (StripeCheckout.getUrlParameter('result') === 'success') {
        // give it a small delay so we can display the cart first then clear it
        setTimeout(function(){ StripeCheckout.clearCart(); }, 3000);
    }

});
