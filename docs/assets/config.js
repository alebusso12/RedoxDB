/* Site configuration. Both values are public by design: the publishable (anon) key
 * grants only what the database's row-level security allows, and every table
 * requires a signed-in member. Never put the service-role key here.
 * While both are empty the site reads ../data/*.json (local preview only). */
window.RDB_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
