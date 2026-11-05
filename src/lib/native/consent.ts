import { isNative } from "./platform";

let pending: Promise<import("@capacitor-community/admob").AdmobConsentInfo | null> | undefined;
// UMP determines the applicable geography; never infer consent from app terms.
export function refreshAdConsent() {
  if (!isNative() || !process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID) return Promise.resolve(null);
  if (!pending) {
    pending = (async () => {
      const { AdMob, AdmobConsentStatus } = await import("@capacitor-community/admob");
      let info = await AdMob.requestConsentInfo();
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable)
        info = await AdMob.showConsentForm();
      return info;
    })().finally(() => { pending = undefined; });
  }
  return pending;
}
export async function openAdPrivacyChoices() {
  const { AdMob } = await import("@capacitor-community/admob");
  const info = await AdMob.requestConsentInfo();
  if (info.privacyOptionsRequirementStatus === "REQUIRED") await AdMob.showPrivacyOptionsForm();
  else if (info.isConsentFormAvailable && info.status === "REQUIRED") await AdMob.showConsentForm();
  else throw new Error("No additional ad consent choices are required in your region right now.");
}
