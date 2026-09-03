package com.luminae.game.billing

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.samsung.android.sdk.iap.lib.constants.HelperDefine
import com.samsung.android.sdk.iap.lib.helper.IapHelper

@CapacitorPlugin(name = "LuminaeBilling")
class LuminaeBillingPlugin : Plugin() {
    private lateinit var iapHelper: IapHelper

    override fun load() {
        iapHelper = IapHelper.getInstance(context)
        // Production is also the required mode for Galaxy Store beta tracks.
        iapHelper.setOperationMode(HelperDefine.OperationMode.OPERATION_MODE_PRODUCTION)
    }

    @PluginMethod
    fun getProvider(call: PluginCall) {
        call.resolve(JSObject().put("provider", "samsung_iap"))
    }

    @PluginMethod
    fun getProducts(call: PluginCall) {
        val productIds = call.getArray("productIds")?.toList<String>() ?: emptyList()
        if (productIds.isEmpty()) {
            call.reject("No product identifiers were supplied")
            return
        }
        iapHelper.getProductsDetails(productIds.joinToString(",")) { error, products ->
            if (error.errorCode != IapHelper.IAP_ERROR_NONE) {
                call.reject("Galaxy Store products could not be loaded (${error.errorCode})")
                return@getProductsDetails
            }
            val output = JSArray()
            products.forEach { product ->
                output.put(JSObject()
                    .put("productId", product.itemId)
                    .put("localizedPrice", product.itemPriceString)
                    .put("currencyCode", product.currencyCode))
            }
            call.resolve(JSObject().put("products", output))
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val productId = call.getString("productId")
        val accountId = call.getString("obfuscatedAccountId")
        if (productId == null || accountId == null) {
            call.reject("Product and account proof are required")
            return
        }
        val started = iapHelper.startPayment(productId, accountId, accountId) { error, purchase ->
            if (error.errorCode != IapHelper.IAP_ERROR_NONE || purchase == null) {
                call.reject("Galaxy Store purchase failed (${error.errorCode})")
                return@startPayment
            }
            call.resolve(JSObject()
                .put("productId", purchase.itemId)
                .put("purchaseToken", purchase.purchaseId))
        }
        if (!started) call.reject("Galaxy Store purchase could not start")
    }

    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        val started = iapHelper.getOwnedList(IapHelper.PRODUCT_TYPE_ALL) { error, purchases ->
            if (error.errorCode != IapHelper.IAP_ERROR_NONE) {
                call.reject("Galaxy Store purchases could not be restored (${error.errorCode})")
                return@getOwnedList
            }
            val output = JSArray()
            purchases.forEach { purchase ->
                output.put(JSObject()
                    .put("productId", purchase.itemId)
                    .put("purchaseToken", purchase.purchaseId))
            }
            call.resolve(JSObject().put("purchases", output))
        }
        if (!started) call.reject("Galaxy Store restore could not start")
    }
}
