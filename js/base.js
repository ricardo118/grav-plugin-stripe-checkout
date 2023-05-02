(function(window) {
    // Create the blank global variable
    window.StripeCheckout = {};

    document.addEventListener("DOMContentLoaded", function() {
        // copy the plugin's settings into the variable (required for the stripe key and urls)
        StripeCheckout.settings = window.PLUGIN_STRIPE_CHECKOUT.settings || {};
        // Unused for now - could be used for adding variable text translations
        StripeCheckout.translations = window.PLUGIN_STRIPE_CHECKOUT.strings || {};
    });

})(window);

(function(StripeCheckout) {

    // The plugin leverages localStorage https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
    // It uses localstorage to keep users's carts saved so they can be picked up even if they leave the website.
    // So, first thing we do is pull items from the storage, and if none exist, empty the cart.
    StripeCheckout.items = JSON.parse(localStorage.getItem('stripe-checkout-items')) || [];

    /***********************************************************/
    /* Add a product to the cart
    /*
    /* This is the main function of the plugin, can be used via
    /* StripeCheckout.addProduct('sku_here', quantity, extras)
    /* Quantity can be a positive or negative number (negative will
    /* reduce the quantity - at 0 or less, item gets removed)
    /* Extras can be any other product information you need to store,
    /* such as images, product routes, etc.
    /***********************************************************/
    StripeCheckout.addProduct = function addProduct(sku, quantity, extras = null)
    {
        // Check if product already in the cart
        const products = (StripeCheckout.items).filter(function(item) {
            return item.sku === sku;
        });
        const product = products[0];

        if (!product) {
            let product = {sku: sku, quantity: quantity};

            if (extras) {
                // any extras? add them too or skip them
               product.extras = extras;
            }

            StripeCheckout.items.push(product);
            console.log('Added ' + quantity + ' of ' + sku);
            window.dispatchEvent(new CustomEvent('sc-added', { detail : {'product': product, 'items': StripeCheckout.items } }));

        } else {
            // product exists -> update the quantity
            product.quantity = parseInt(product.quantity) + parseInt(quantity);

            if (extras) {
                // any extras? add them
                product.extras = extras;
            }

            console.log('Changed quantity of ' + sku + ' by: ' + quantity);
            window.dispatchEvent(new CustomEvent('sc-updated', { detail : {'product': product, 'items': StripeCheckout.items } }));
        }

        if (product && product.quantity <= 0) {
            // Quantity now at or below 0? remove the product
            console.log('Quantity at 0, removing product.');
            StripeCheckout.removeProduct(product.sku);
            return;
        }

        StripeCheckout._saveToLocalStorage();
    };

    /***********************************************************/
    /* Redirect to Stripe Checkout
    /*
    /* The function that sends the user to the Stripe payment page
    /* This function can output error messages if you create an
    /* element with ID="error-message". It requires the stripe
    /* public key set in the plugin configs as well as the success
    /* and cancel urls.
    /***********************************************************/
    StripeCheckout.goToCheckout = async function goToCheckout() {
        console.log('goToCheckout called');
      
        // Send cart data to the server before redirecting to Stripe Checkout
        StripeCheckout.sendCartData();
      
        const cart = StripeCheckout.items.map(item => ({
          id: item.sku,
          name: item.extras.name,
          price: item.extras.price, // Convert dollars to cents
          quantity: item.quantity
        }));
      
        try {
          const response = await fetch(StripeCheckout.settings.session_route, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(cart)
          });
          const data = await response.json();
          if (data.status === 'success') {
            const sessionId = data.sessionId;
            const stripe = Stripe(StripeCheckout.settings.key);
      
            stripe.redirectToCheckout({ sessionId: sessionId }).then(function (result) {
              if (result.error) {
                // If `redirectToCheckout` fails due to a browser or network
                // error, display the localized error message to your customer.
                const displayError = document.getElementById('error-message');
                displayError.textContent = result.error.message;
              }
            });
          } else {
            // Handle errors
            console.error('Error creating checkout session:', data.message);
          }
        } catch (error) {
          console.error('Error creating checkout session:', error);
          const displayError = document.getElementById('error-message');
          displayError.textContent = error.message;
        }
      };      

    /***********************************************************/
    /* Get Checkout Items - formatted for Stripe API
    /*
    /* A function to format the items ready for the redirectToCheckout()
    /* this function will just remove the extras for all the items
    /* to avoid any errors thrown by Stripe
    /***********************************************************/
    StripeCheckout.getOrderItems = function getOrderItems()
    {
        let items = [];
        (StripeCheckout.items).forEach(item =>
            items.push({
                price: item.sku,
                quantity: item.quantity,
            })
        );

        return items;
    };

    /***********************************************************/
    /* Get a product from the cart
    /*
    /* Returns a product object
    /***********************************************************/
    StripeCheckout.getProduct = function getProduct(sku)
    {
        const index = (StripeCheckout.items).findIndex(item => item.sku === sku);
        return StripeCheckout.items[index];
    };

    /***********************************************************/
    /* Remove a product from the cart
    /*
    /* Attempts to remove the requested SKU from the cart, does
    /* nothing if SKU not found. Updates localStorage
    /***********************************************************/
    StripeCheckout.removeProduct = function removeProduct(sku)
    {
        const index = (StripeCheckout.items).findIndex(item => item.sku === sku);
        const product = StripeCheckout.items[index];

        if (index === -1) {
            console.log('Product ' + sku + ' not in cart. Nothing removed.');
            return;
        }

        (StripeCheckout.items).splice(index, 1);

        console.log('Product ' + sku + ' removed.', StripeCheckout.items);
        window.dispatchEvent(new CustomEvent('sc-removed', { detail : {'product': product, 'items': StripeCheckout.items } }));
        StripeCheckout._saveToLocalStorage();
    };

    /***********************************************************/
    /* Save the shopping cart to the local storage
    /***********************************************************/
    StripeCheckout._saveToLocalStorage = function _saveToLocalStorage()
    {
        localStorage.setItem('stripe-checkout-items', JSON.stringify(StripeCheckout.items));
    };

    /***********************************************************/
    /* Grabs the shopping cart from the local storage
    /***********************************************************/
    StripeCheckout._getFromLocalStorage = function _getFromLocalStorage()
    {
        return JSON.parse(localStorage.getItem('stripe-checkout-items'));
    };

    /***********************************************************/
    /* Clear the shopping cart
    /***********************************************************/
    StripeCheckout.clearCart = function clearCart()
    {
        StripeCheckout.items = [];
        localStorage.removeItem('stripe-checkout-items');

        console.log('Cart & local storage has been cleared');
        window.dispatchEvent(new Event('sc-cleared'));
        StripeCheckout._saveToLocalStorage();
    };

    /***********************************************************/
    /* Increase item quantity
    /***********************************************************/
    StripeCheckout.increaseQuantity = function increaseQuantity(sku, quantity)
    {
        StripeCheckout.addProduct(sku, quantity);
    };

    /***********************************************************/
    /* Decrease Item Quantity
    /***********************************************************/
    StripeCheckout.decreaseQuantity = function decreaseQuantity(sku, quantity)
    {
        quantity = Math.sign(quantity) === -1 ? quantity : -(quantity);
        StripeCheckout.addProduct(sku, quantity);
    };

    /***********************************************************/
    /* Set a product quantity
    /*
    /* Returns a product object
    /***********************************************************/
    StripeCheckout.setQuantity = function setQuantity(id, quantity)
    {
        const product = StripeCheckout.getProduct(id);
        product.quantity = parseInt(quantity);

        window.dispatchEvent(new CustomEvent('sc-updated', { detail : {'product': product, 'items': StripeCheckout.items } }));
        StripeCheckout._saveToLocalStorage();

        return product;
    };

    /***********************************************************/
    /* Search URL queries - Helper function
    /*
    /* A function to read URL query strings. example.com?test=blabla
    /* Usage:
    /* StripeCheckout.getUrlParameter('test') returns 'blabla'
    /***********************************************************/
    StripeCheckout.getUrlParameter = function getUrlParameter(sParam) {
        let sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
            }
        }
    };

    /***********************************************************/
    /* Function to send cart data to the server
    /***********************************************************/
    StripeCheckout.sendCartData = function sendCartData() {
        // Convert StripeCheckout items into a cart array
        const cart = StripeCheckout.items.map(item => ({
          id: item.sku,
          name: item.extras.name,
          price: item.extras.price,
          quantity: item.quantity
        }));
      
        console.log('Cart data before sending to server:', cart);
      
        // Send cart items to the server.
        fetch(StripeCheckout.settings.session_route, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cart)
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            console.log('Cart data sent to server:', data);
          } else {
            // Handle errors
            console.error('Error creating session:', data.message);
          }
        })
        .catch(error => {
          console.error('Error creating session:', error);
        });
      };      

})(window.StripeCheckout);
