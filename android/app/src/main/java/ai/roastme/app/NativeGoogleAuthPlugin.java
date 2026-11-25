package ai.roastme.app;

import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String WEB_CLIENT_ID =
        "202323123911-kddf74rtklnujn2mfp1hf8cjmq774jpk.apps.googleusercontent.com";

    @PluginMethod
    public void signIn(PluginCall call) {
        String nonce = call.getString("nonce");
        if (nonce == null || !nonce.matches("[a-f0-9]{64}")) {
            call.reject("Invalid Google sign-in nonce.");
            return;
        }
        var activity = getActivity();
        activity.runOnUiThread(() -> {
            var option = new GetSignInWithGoogleOption.Builder(WEB_CLIENT_ID)
                .setNonce(nonce)
                .build();
            var request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
            CredentialManager.create(activity).getCredentialAsync(
                activity, request, null, ContextCompat.getMainExecutor(activity),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        var credential = response.getCredential();
                        if (!(credential instanceof CustomCredential)
                            || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                            call.reject("Google returned an unexpected credential.");
                            return;
                        }
                        try {
                            String token = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                            call.resolve(new JSObject().put("token", token));
                        } catch (Exception error) {
                            call.reject("Google returned an invalid credential.");
                        }
                    }

                    @Override
                    public void onError(GetCredentialException error) {
                        if (error instanceof GetCredentialCancellationException) {
                            call.resolve(new JSObject());
                            return;
                        }
                        call.reject("Android Google sign-in failed. Check Google Play services and the app signing configuration.", error);
                    }
                });
        });
    }
}
