package ai.roastme.app;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.*;
import org.json.*;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall purchaseCall;
    private final Map<String, ProductDetails> details = new HashMap<>();

    private void connected(PluginCall call, Runnable action) {
        if (client == null) client = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
        if (client.isReady()) { action.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject("Google Play billing is unavailable. Try again from a Play-installed version.");
            }
            public void onBillingServiceDisconnected() { }
        });
    }
    private JSObject receipt(Purchase p) {
        JSObject result = new JSObject();
        result.put("signedData", p.getOriginalJson());
        result.put("signature", p.getSignature());
        return result;
    }
    @PluginMethod public void products(PluginCall call) {
        JSArray specs = call.getArray("products");
        if (specs == null || specs.length() == 0 || specs.length() > 2) { call.reject("No subscription plans configured."); return; }
        connected(call, () -> {
            List<QueryProductDetailsParams.Product> products = new ArrayList<>();
            for (int i=0;i<specs.length();i++) {
                JSONObject spec=specs.optJSONObject(i);
                if (spec == null) { call.reject("Invalid plan configuration."); return; }
                products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(spec.optString("productId")).setProductType(BillingClient.ProductType.SUBS).build());
            }
            client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(), (result, response) -> {
                if (result.getResponseCode()!=BillingClient.BillingResponseCode.OK) { call.reject("Unable to load Google Play prices."); return; }
                JSArray found = new JSArray(); details.clear();
                for (ProductDetails product: response.getProductDetailsList()) {
                    details.put(product.getProductId(), product);
                    for(int i=0;i<specs.length();i++) {
                        JSONObject spec=specs.optJSONObject(i);
                        if(!product.getProductId().equals(spec.optString("productId"))) continue;
                        if(product.getSubscriptionOfferDetails()==null) continue;
                        for(ProductDetails.SubscriptionOfferDetails offer: product.getSubscriptionOfferDetails()) {
                            // Offer-free base plan only; never silently substitute another period or trial.
                            if(offer.getOfferId()!=null || !offer.getBasePlanId().equals(spec.optString("basePlanId"))) continue;
                            List<ProductDetails.PricingPhase> phases=offer.getPricingPhases().getPricingPhaseList();
                            if(phases.isEmpty()) continue;
                            ProductDetails.PricingPhase phase=phases.get(phases.size()-1);
                            if(!phase.getBillingPeriod().equals(spec.optString("period")) || phase.getRecurrenceMode()!=ProductDetails.RecurrenceMode.INFINITE_RECURRING) continue;
                            JSObject plan=new JSObject();plan.put("plan",spec.optString("plan"));plan.put("productId",product.getProductId());plan.put("basePlanId",offer.getBasePlanId());plan.put("offerToken",offer.getOfferToken());plan.put("priceString",phase.getFormattedPrice());plan.put("period",phase.getBillingPeriod());found.put(plan);
                        }
                    }
                }
                JSObject out=new JSObject();out.put("products",found);call.resolve(out);
            });
        });
    }
    @PluginMethod public void purchase(PluginCall call) {
        if(purchaseCall!=null){call.reject("A purchase is already open.");return;}
        String productId=call.getString("productId"), offerToken=call.getString("offerToken"), account=call.getString("accountId");
        ProductDetails product=details.get(productId);
        if(product==null || offerToken==null || account==null || !account.matches("[0-9a-f]{64}")){call.reject("Reload subscription prices before purchasing.");return;}
        connected(call, () -> getActivity().runOnUiThread(() -> {
            purchaseCall=call;
            BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(offerToken).build();
            BillingResult result=client.launchBillingFlow(getActivity(),BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).setObfuscatedAccountId(account).build());
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){purchaseCall=null;call.reject("Google Play could not open checkout. No purchase was completed.");}
        }));
    }
    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call=purchaseCall; purchaseCall=null;
        if(call==null)return;
        if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED){call.reject("Purchase cancelled.");return;}
        if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK || purchases==null){call.reject("Purchase could not be completed. Restore purchases to retry verification.");return;}
        JSArray found=new JSArray();
        for(Purchase p:purchases) if(p.getPurchaseState()==Purchase.PurchaseState.PURCHASED)found.put(receipt(p));
        if(found.length()==0){call.reject("Payment is pending. Premium starts after Google Play confirms payment.");return;}
        JSObject out=new JSObject();out.put("purchases",found);call.resolve(out);
    }
    @PluginMethod public void restore(PluginCall call) {
        connected(call, () -> client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),(result,purchases)->{
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){call.reject("Unable to restore Google Play purchases.");return;}
            JSArray found=new JSArray();for(Purchase p:purchases)if(p.getPurchaseState()==Purchase.PurchaseState.PURCHASED)found.put(receipt(p));
            JSObject out=new JSObject();out.put("purchases",found);call.resolve(out);
        }));
    }
    @Override protected void handleOnDestroy(){if(client!=null)client.endConnection();if(purchaseCall!=null){purchaseCall.reject("Checkout closed. Restore purchases to check its status.");purchaseCall=null;}super.handleOnDestroy();}
}
