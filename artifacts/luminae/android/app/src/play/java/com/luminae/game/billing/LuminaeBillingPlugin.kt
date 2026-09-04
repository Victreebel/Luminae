package com.luminae.game.billing

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "LuminaeBilling")
class LuminaeBillingPlugin : Plugin(), PurchasesUpdatedListener {
    private lateinit var billingClient: BillingClient
    private val details = mutableMapOf<String, ProductDetails>()
    private var pendingCall: PluginCall? = null
    private var pendingProductId: String? = null

    override fun load() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .enableAutoServiceReconnection()
            .build()
    }

    private fun withClient(call: PluginCall, action: () -> Unit) {
        if (billingClient.isReady) {
            action()
            return
        }
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) action()
                else call.reject("Google Play Billing is unavailable (${result.responseCode})")
            }

            override fun onBillingServiceDisconnected() = Unit
        })
    }

    @PluginMethod
    fun getProvider(call: PluginCall) {
        call.resolve(JSObject().put("provider", "google_play"))
    }

    @PluginMethod
    fun getProducts(call: PluginCall) {
        val productIds = call.getArray("productIds")?.toList<String>() ?: emptyList()
        if (productIds.isEmpty()) {
            call.reject("No product identifiers were supplied")
            return
        }
        withClient(call) {
            val products = productIds.map { productId ->
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            }
            val params = QueryProductDetailsParams.newBuilder().setProductList(products).build()
            billingClient.queryProductDetailsAsync(params) { result, queryResult ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject("Google Play products could not be loaded (${result.responseCode})")
                    return@queryProductDetailsAsync
                }
                val output = JSArray()
                queryResult.productDetailsList.forEach { product ->
                    details[product.productId] = product
                    val offer = product.oneTimePurchaseOfferDetailsList?.firstOrNull()
                        ?: product.oneTimePurchaseOfferDetails
                    if (offer != null) {
                        output.put(JSObject()
                            .put("productId", product.productId)
                            .put("localizedPrice", offer.formattedPrice)
                            .put("currencyCode", offer.priceCurrencyCode))
                    }
                }
                call.resolve(JSObject().put("products", output))
            }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val productId = call.getString("productId")
        val accountId = call.getString("obfuscatedAccountId")
        val product = productId?.let(details::get)
        if (productId == null || accountId == null || product == null) {
            call.reject("Load this product before purchasing it")
            return
        }
        if (pendingCall != null) {
            call.reject("Another purchase is already in progress")
            return
        }
        val offer = product.oneTimePurchaseOfferDetailsList?.firstOrNull()
            ?: product.oneTimePurchaseOfferDetails
        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(product)
            .apply { if (offer != null) setOfferToken(offer.offerToken) }
            .build()
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .setObfuscatedAccountId(accountId)
            .build()
        pendingCall = call
        pendingProductId = productId
        val result = billingClient.launchBillingFlow(activity, params)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
            pendingCall = null
            pendingProductId = null
            call.reject("Google Play purchase could not start (${result.responseCode})")
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingCall ?: return
        val expectedProduct = pendingProductId
        pendingCall = null
        pendingProductId = null
        if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("Purchase cancelled")
            return
        }
        val purchase = purchases?.firstOrNull { expectedProduct in it.products }
        if (result.responseCode != BillingClient.BillingResponseCode.OK || purchase == null) {
            call.reject("Google Play did not return a valid purchase (${result.responseCode})")
            return
        }
        call.resolve(JSObject()
            .put("productId", expectedProduct)
            .put("purchaseToken", purchase.purchaseToken))
    }

    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        withClient(call) {
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            billingClient.queryPurchasesAsync(params) { result, purchases ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject("Google Play purchases could not be restored (${result.responseCode})")
                    return@queryPurchasesAsync
                }
                val output = JSArray()
                purchases.forEach { purchase ->
                    purchase.products.forEach { productId ->
                        output.put(JSObject()
                            .put("productId", productId)
                            .put("purchaseToken", purchase.purchaseToken))
                    }
                }
                call.resolve(JSObject().put("purchases", output))
            }
        }
    }

    override fun handleOnDestroy() {
        if (::billingClient.isInitialized) billingClient.endConnection()
        super.handleOnDestroy()
    }
}
