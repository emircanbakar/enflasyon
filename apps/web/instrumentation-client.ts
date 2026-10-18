import { reportError } from "@/lib/monitoring";

// Yakalanmamış hatalar. Yalnızca kendi origin'imizden gelen script hataları sayılır
// (tarayıcı eklentileri ve dış script'ler gürültü üretmesin).
window.addEventListener("error", (event) => {
  if (event.filename && !event.filename.startsWith(window.location.origin)) return;
  reportError(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  reportError(event.reason);
});
