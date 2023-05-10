<?php
namespace Grav\Plugin;

use Grav\Common\Assets;
use Grav\Common\Page\Page;
use Grav\Common\Page\Pages;
use Grav\Common\Page\Types;
use Grav\Common\Plugin;
use RocketTheme\Toolbox\Event\Event;
use Stripe\Stripe;

require_once __DIR__ . '/vendor/autoload.php';

/**
 * Class StripeCheckoutPlugin
 * @package Grav\Plugin
 */
class StripeCheckoutPlugin extends Plugin
{
    private $configs;

    /**
     * @return array
     *
     * The getSubscribedEvents() gives the core a list of events
     *     that the plugin wants to listen to. The key of each
     *     array section is the event that the plugin listens to
     *     and the value (in the form of an array) contains the
     *     callable (or function) as well as the priority. The
     *     higher the number the higher the priority.
     */
    public static function getSubscribedEvents()
    {
        return [
            'onPluginsInitialized' => ['onPluginsInitialized', 0],
            'onGetPageTemplates' => ['onGetPageTemplates', 0],
            'onPageInitialized' => ['onPageInitialized', 0]
        ];
    }

    /**
     * Initialize the plugin
     */
    public function onPluginsInitialized()
    {
        // Don't proceed if we are in the admin plugin
        if ($this->isAdmin()) {
            return;
        }

        $this->configs = $this->config->get('plugins.stripe-checkout');
        // Enable the main event we are interested in
        $this->enable([
            'onTwigTemplatePaths' => ['onTwigTemplatePaths', 0],
            'onAssetsInitialized' => ['onAssetsInitialized', 0]
        ]);

        $uri = $this->grav['uri'];
        if ($this->configs['checkout_route'] == $uri->path())
        {
            $this->enable([
                'onPagesInitialized' => ['addCheckoutPage', 0]
            ]);
        }

        $custom_route = $this->configs['session_route'];
        if ($uri->path() === $custom_route) {
            $this->enable([
                'onPageInitialized' => ['createCheckoutSession', 0],
            ]);
        }

    }

    /**
     * Initialize the page
     */
    public function onPageInitialized()
    {
        $uri = $this->grav['uri'];
        $route = $this->config->get('plugins.stripe-checkout.session_route');
    
        if ($uri->path() === $route) {

            // Read the cart data from the request
            $requestData = json_decode(file_get_contents('php://input'), true);

            $checkout_session = null;

            if (isset($requestData['cart'])) {
                $cartData = $requestData['cart'];
                $comments = $requestData['comments'] ?? '';
                // Call the createCheckoutSession function with the cart data
                $checkout_session = $this->createCheckoutSession($cartData, $comments);
            } else {
                // TODO: Handle the case when cart data is missing, which should be an issue
            }
    
            if (isset($checkout_session->id)) {
                $this->grav['log']->info('Checkout Session created: ' . print_r($checkout_session, true));

                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'sessionId' => $checkout_session->id,
                ]);
                exit;
            } else {
                $this->grav['log']->info('Failed to create Checkout Session: ' . print_r($checkout_session, true));

                // Handle error when creating the Checkout Session
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Failed to create Checkout Session',
                ]);
                exit;
            }
        }
    }         

    /**
     * Add page template types.
     * @param Event $event
     */
    public function onGetPageTemplates(Event $event)
    {
        /** @var Types $types */
        $types = $event->types;
        $types->scanTemplates('plugins://stripe-checkout/templates');
    }

    /**
     * Add current directory to twig lookup paths.
     */
    public function onTwigTemplatePaths()
    {
        $this->grav['twig']->twig_paths[] = __DIR__ . '/templates';
    }

    /**
     * Handles initializing the assets
     */
    public function onAssetsInitialized()
    {
        /** @var Assets $assets */
        $assets = $this->grav['assets'];
        $assets->addJs('https://js.stripe.com/v3/');
        $assets->addJs('plugins://stripe-checkout/js/base.js');
        $assets->addJs('plugins://stripe-checkout/js/events.js');

        $global = "if (!window.PLUGIN_STRIPE_CHECKOUT) { window.PLUGIN_STRIPE_CHECKOUT = {}; }";
        $js = "window.PLUGIN_STRIPE_CHECKOUT.settings = {$this->frontEndConfigs()};";
        $assets->addInlineJs($global);
        $assets->addInlineJs($js);
    }

    public function frontEndConfigs()
    {
        $configs = $this->configs;
        unset($configs['stripe']['keys']['test']['secret']);
        unset($configs['stripe']['keys']['live']['secret']);
        unset($configs['stripe']['wh_secret']);
        unset($configs['secret_key']);
        return json_encode($configs);
    }

    public function addCheckoutPage()
    {
        $this->addPage($this->configs['checkout_route'], 'checkout.md');
    }

    public function addPage($url, $filename)
    {
        /** @var Pages $pages */
        $pages = $this->grav['pages'];
        $page = $pages->dispatch($url);

        if (!$page) {
            $page = new Page;
            $page->init(new \SplFileInfo(__DIR__ . '/pages/' . $filename));
            $page->slug(basename($url));
            $pages->addPage($page, $url);
        }

    }

    public function createCheckoutSession($cartData, string $comments = '')
    {
        try {
            Stripe::setApiKey($this->configs['secret_key']);
    
            $line_items = [];
            $metadata = [];
            $this->grav['log']->info('comments: ' . $comments);

            foreach ($cartData as $index => $item) {
                // Skip processing if the cart data has "amount" and "currency" fields
                if (isset($item['amount'], $item['currency'])) {
                    continue;
                }
    
                if (is_array($item) && isset($item['id'], $item['name'], $item['price'], $item['quantity'])) {
                    $line_items[] = [
                        'price_data' => [
                            'currency' => 'usd',
                            'product_data' => [
                                'name' => $item['name'],
                            ],
                            'unit_amount' => $item['price'] * 100, // Multiply the price in dollars by 100 to convert to cents
                        ],
                        'quantity' => $item['quantity'],
                    ];
    
                    // Add metadata for each item and comments
                    $metadata["item_{$index}_sku"] = $item['id'];
                    $metadata["item_{$index}_quantity"] = $item['quantity'];
                    if (!empty($comments)) {
                        $metadata["comments"] = $comments;
                    }
                } else {
                    // Skip the current iteration if $item is not in the expected format
                    continue;
                }
            }
    
            if (!empty($line_items)) {
                $checkout_session = \Stripe\Checkout\Session::create([
                    'payment_method_types' => ['card'],
                    'line_items' => $line_items,
                    'metadata' => $metadata,
                    'mode' => 'payment',
                    'success_url' => $this->configs['success_url'],
                    'cancel_url' => $this->configs['cancel_url'],
                ]);
                return $checkout_session;
            }
        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }    

    public function createPaymentIntent($cartData)
    {
        try {
            // Set the API key
            Stripe::setApiKey($this->configs['secret_key']);

            // Initialize the total amount
            $totalAmount = 0;

            // Check if the cart data has an 'amount' key
            if (array_key_exists('amount', $cartData)) {
                // Set the total amount to the value of the 'amount' key
                $totalAmount = $cartData['amount'];
            } else {
                // Calculate the total amount of the cart using line items
                foreach ($cartData as $item) {
                    if (isset($item['price']) && isset($item['quantity'])) {
                        $totalAmount += $item['price'] * $item['quantity'];
                    }
                }
            }

            // Ensure the total amount is greater than or equal to 1
            if ($totalAmount < 1) {
                // Log the error and return null
                $this->grav['log']->error('The total amount must be greater than or equal to 1.');
                return null;
            }

            // Create the payment intent
            $paymentIntent = \Stripe\PaymentIntent::create([
                'amount' => $totalAmount * 100, // Stripe expects amount in cents
                'currency' => 'usd',
            ]);

            // Log the payment intent as a JSON string
            $this->grav['log']->info('Payment intent created: ' . json_encode($paymentIntent));

            return $paymentIntent;
        } catch (\Stripe\Exception\ApiErrorException $e) {
            // Log the error message and return null
            $this->grav['log']->error('Error creating payment intent: ' . $e->getMessage());
            return null;
        }
    }

}
