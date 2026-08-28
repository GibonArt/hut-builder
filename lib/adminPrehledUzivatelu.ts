/** Řádek z RPC `admin_prehled_uzivatelu_karet`. */
export type AdminUzivatelRadek = {
  user_id: string;
  email: string;
  registered_at: string;
  pocet_karet: number;
};
