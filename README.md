# Stripe Checkout Plugin

The **Stripe Checkout** Plugin is an extension for [Grav CMS](http://github.com/getgrav/grav).

This plugin is **simple** and **extensible**, this means that there is very little mandatory items for you. You are free to use any HTML elements, structure and styling you so wish.a

The plugin requires some use of the stripe dashboard which will be covered below. This is done for a few reasons, mainly, so that all customer data is stored only in Stripe, making it far easier to comply with GDPR rules as well as increasing security. The downside is that you need to work with both Stripe dashboard and Grav together.

## Installation

Installing the Stripe Checkout plugin can be done in one of three ways: The GPM (Grav Package Manager) installation method lets you quickly install the plugin with a simple terminal command, the manual method lets you do so via a zip file, and the admin method lets you do so via the Admin Plugin.

### GPM Installation (Preferred)

To install the plugin via the [GPM](http://learn.getgrav.org/advanced/grav-gpm), through your system's terminal (also called the command line), navigate to the root of your Grav-installation, and enter:

    bin/gpm install stripe-checkout

This will install the Stripe Checkout plugin into your `/user/plugins`-directory within Grav. Its files can be found under `/your/site/grav/user/plugins/stripe-checkout`.

### Manual Installation

To install the plugin manually, download the zip-version of this repository and unzip it under `/your/site/grav/user/plugins`. Then rename the folder to `stripe-checkout`. You can find these files on [GitHub](https://github.com/ricardo118/grav-plugin-stripe-checkout) or via [GetGrav.org](http://getgrav.org/downloads/plugins#extras).

You should now have all the plugin files under

    /your/site/grav/user/plugins/stripe-checkout

> NOTE: This plugin is a modular component for Grav which may require other plugins to operate, please see its [blueprints.yaml-file on GitHub](https://github.com/ricardo118/grav-plugin-stripe-checkout/blob/master/blueprints.yaml).

### Admin Plugin

If you use the Admin Plugin, you can install the plugin directly by browsing the `Plugins`-menu and clicking on the `Add` button.

## Configuration

Before configuring this plugin, you should copy the `user/plugins/stripe-checkout/stripe-checkout.yaml` to `user/config/plugins/stripe-checkout.yaml` and only edit that copy.

Here is the default configuration and an explanation of available options:

```yaml
enabled: true
key: 'pk_test_xxxxxxxxxxxxxxxxxx'                                   # Your public key from stripe is all that is required
success_url: 'https://example.com/checkout?result=success'          # The return url when ur payments are successful. It can be any url you desire, handling the display is up to you.
cancel_url: 'https://example.com/checkout?result=canceled'          # The return url when ur payments are unsuccessful. It can be any url you desire, handling the display is up to you.
checkout_route: '/checkout'
```

Note that if you use the Admin Plugin, a file with your configuration named stripe-checkout.yaml will be saved in the `user/config/plugins/`-folder once the configuration is saved in the Admin.

## Usage

### Preparation for Plugin in **Stripe Dashboard**

Before using the plugin in the Grav, you must also setup your Stripe account. I will assume you have already made a stripe account, and as such, first step is to go to your checkout settings.

Step 1:
[Checkout Settings](https://dashboard.stripe.com/account/checkout/settings)
Enable Checkout client-only integration. Optional: Set up your domains for security, enable apple pay and google pay.

Step 2:
Create a new product [Create a Product](https://dashboard.stripe.com/products/create)

Step 3:
Create some SKUs under the product. Setup their price, image and name.

The way you organize your Products, Skus is entirely up to you and your needs.

Example, create a product called `Helmet X`, and 3 SKUs called `Black`, `Blue`, `Pink`.

Now that we have most of Stripe configuration completed, we move over to the Grav Site.

Step 4:
Configure the plugin, you will need to add your Stripe public key, a `cancel_url` and a `success_url`. The `success_url` and `cancel_url` are used after the user completes payments. You can keep the original plugin locations or modify them to any page you wish. The `checkout_route` is a custom page that the plugin builds so that you can customize your checkout without having it show in your `/user/pages` - to avoid clients making modifications to the checkout page.

Step 5:
Create a page in Grav that you wish to use to sell products. You can test and see the plugin's example by making a page of type `example_product.md`. In the frontmatter, I recommend adding two options:

```
---
title: My Product X
price: 15
sku: sku_GUElmyYEy14yb5
---
```

Now, all the plugin needs is the SKU, however the price is useful for displaying it prior to reaching stripe checkout.

Extra Steps:
I recommend looking at the `example_product.html.twig` to see how to add the preset buttons for the plugin. There is no requirement to use these buttons/elements however they have instructions on them and good examples on how you can further expand your own customizations.

I have also made global javascript variable `StripeCheckout` which you can access with your own custom javascript and play with. This variable holds the cart items and quantities within `StripeCheckout.items`. There are a number of useful methods you can use to manage your plugin. You can see all the available methods in `base.js` as well as examples of how to use them in `events.js` and `example.js`.

## Discord

Message me on the Grav Discord Server using @Ricardo if you have some questions, suggestions or in need of help.

## TO DO

I am currently working on a much more advanced version of this plugin, which is currently in progress. You can find it on
[SQUIDCART](https://github.com/ricardo118/grav-plugin-squidcart), it is not yet functional. However it will have many more features.

