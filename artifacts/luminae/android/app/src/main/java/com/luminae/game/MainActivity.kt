package com.luminae.game

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.luminae.game.billing.LuminaeBillingPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(LuminaeBillingPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
