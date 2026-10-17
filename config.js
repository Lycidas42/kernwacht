// Kernwacht – Konfiguration
// Online-Anzeige und Bestenliste: Supabase-Projekt eintragen (siehe README, Abschnitt "Online").
// Leer lassen = Online-Funktionen bleiben aus, das Spiel läuft komplett lokal.
window.KW_CONFIG = {
  supabaseUrl: 'https://abgowprdmthysomwewmk.supabase.co',
  supabaseKey: 'sb_publishable_eulndCOSfvkPy3YoGMJCZw_45q1NO3t', // Publishable Key, darf öffentlich sein
  // Push-Benachrichtigungen: öffentlicher VAPID-Schlüssel (der private liegt nur in den Secrets der Edge Function)
  vapidKey: 'BIm3LrFYqSl6iA2QzShJHZu3-8bHwqeOeQFyVQge2FbmT2asGl_trJdHzaXBFq4VgRd7u0bKB3SMsBh0ZFFbkdg',
};
