// One ID per loaded page or native WebView; separate tabs never share it.
let instance: string | undefined;
export function appInstanceId() {
  return (instance ||= crypto.randomUUID());
}
