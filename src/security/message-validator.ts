/**
 * Guards every chrome.runtime.onMessage handler in the service worker.
 * A malicious page script could otherwise send spoofed START_CAPTURE messages.
 * Every SW message handler MUST call isValidSender(sender) before processing.
 */
export function isValidSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}
