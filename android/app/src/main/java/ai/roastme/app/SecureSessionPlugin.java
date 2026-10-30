package ai.roastme.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    @PluginMethod public void installTime(PluginCall call) {
        try {
            long installed = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).firstInstallTime;
            JSObject result = new JSObject(); result.put("timestamp", installed); call.resolve(result);
        } catch (Exception error) { call.reject("Install time unavailable", error); }
    }
    private static final String ALIAS = "roast-auth-v1";
    private SharedPreferences storage() { return getContext().getSharedPreferences("secure-roast-session", Context.MODE_PRIVATE); }
    private synchronized SecretKey encryptionKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey)store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    private String requireKey(PluginCall call) { String key=call.getString("key"); if(key==null || key.length()>200) { call.reject("Invalid storage key");return null; }return key; }
    @PluginMethod public void set(PluginCall call) {
        String key=requireKey(call), value=call.getString("value"); if(key==null)return;
        if(value==null){call.reject("Missing value");return;}
        try {
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,encryptionKey());
            cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
            String encoded=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
            if(!storage().edit().putString(key,encoded).commit())throw new Exception("Session could not be saved");call.resolve();
        }catch(Exception error){call.reject("Unable to securely store session",error);}
    }
    @PluginMethod public void get(PluginCall call) {
        String key=requireKey(call);if(key==null)return;
        String encoded=storage().getString(key,null);JSObject result=new JSObject();
        if(encoded==null){result.put("value",JSObject.NULL);call.resolve(result);return;}
        try {
            String[] pieces=encoded.split(":",2);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,encryptionKey(),new GCMParameterSpec(128,Base64.decode(pieces[0],Base64.NO_WRAP)));
            cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
            result.put("value",new String(cipher.doFinal(Base64.decode(pieces[1],Base64.NO_WRAP)),StandardCharsets.UTF_8));call.resolve(result);
        }catch(Exception error){storage().edit().remove(key).apply();result.put("value",JSObject.NULL);call.resolve(result);}
    }
    @PluginMethod public void remove(PluginCall call) {String key=requireKey(call);if(key==null)return;storage().edit().remove(key).apply();call.resolve();}
}
